import socket
import threading
from cryptography.fernet import Fernet
import sys
import time


LOCAL_PROXY_IP = '127.0.0.1'
LOCAL_PROXY_PORT = 8080
REMOTE_SERVER_IP = '0.tcp.in.ngrok.io'
REMOTE_SERVER_PORT = 11932

SHARED_SECRET_KEY = b'O0gwAWlOpoEmQIlFn51lC357JZ78jI02lj73jQMQVMU=' 
BUFFER_SIZE = 8192
try:
    cipher_suite = Fernet(SHARED_SECRET_KEY)
    print("Encryption cipher initialized successfully.")
except Exception as e:
    print(f"[-] Failed to initialize cipher. Invalid key? Error: {e}")
    exit(1)

def forward_to_server(target_url_bytes):
    """Encrypts data and forwards it to the remote server, returns ENCRYPTED response."""
    server_socket = None
    try:
        print(f"[*] Connecting to remote server {REMOTE_SERVER_IP}:{REMOTE_SERVER_PORT}...")
        server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_socket.settimeout(10)
        server_socket.connect((REMOTE_SERVER_IP, REMOTE_SERVER_PORT))
        server_socket.settimeout(30)
        print("[+] Connected to remote server.")

        encrypted_request = cipher_suite.encrypt(target_url_bytes)
        print(f"[>] Sending {len(encrypted_request)} encrypted bytes (URL) to server.")

        server_socket.sendall(encrypted_request)

        print("[<] Waiting for encrypted response from server...")
        encrypted_response_chunks = []
        while True:
            try:
                chunk = server_socket.recv(BUFFER_SIZE)
                if not chunk:
                    break
                encrypted_response_chunks.append(chunk)
            except socket.timeout:
                print("[-] Timeout waiting for more data from server.")
                
                break
            except socket.error as e:
                print(f"[-] Socket error receiving from server: {e}")
                return None

        if not encrypted_response_chunks:
            print("[-] Received no response data from server.")
            return None

        encrypted_response = b"".join(encrypted_response_chunks)
        print(f"[<] Received total {len(encrypted_response)} encrypted bytes from server.")
        return encrypted_response

    except socket.timeout:
        print(f"[-] Connection attempt to remote server {REMOTE_SERVER_IP}:{REMOTE_SERVER_PORT} timed out.")
        return None
    except socket.error as e:
        print(f"[-] Socket error connecting or sending to server: {e}")
        return None
    except Exception as e:
        print(f"[-] Unexpected error in forward_to_server: {e}")
        return None
    finally:
        if server_socket:
            print("[-] Closing connection to remote server.")
            server_socket.close()


def handle_browser_request(browser_socket):
    """Handles a connection from the web browser."""
    print("[+] New browser connection.")
    try:
        browser_request = browser_socket.recv(BUFFER_SIZE)
        if not browser_request:
            print("[-] Browser disconnected before sending data.")
            return

        print(f"[>] Received {len(browser_request)} bytes from browser.")
        try:
            request_str = browser_request.decode('utf-8', errors='ignore')
            first_line = request_str.split('\r\n')[0]
            parts = first_line.split(' ')
            if len(parts) < 2:
                print("[-] Could not parse browser request line:", first_line)
                return

            method = parts[0]
            target = parts[1]
            
            print(f"[*] Browser requested method: {method}, target: {target}")
            target_url_bytes = target.encode('utf-8')

        except Exception as e:
            print(f"[-] Error parsing browser request: {e}")
            print("[-] Could not determine target URL reliably.")
            return

        encrypted_response = forward_to_server(target_url_bytes)

        if encrypted_response is None:
            print("[-] Failed to get response from remote server.")
            error_page = b"HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/html\r\n\r\n<html><body><h1>502 Bad Gateway</h1><p>Proxy server could not reach the upstream server.</p></body></html>"
            try:
                browser_socket.sendall(error_page)
            except socket.error:
                pass
            return

        try:
            decrypted_response = cipher_suite.decrypt(encrypted_response)
            print(f"[<] Decrypted {len(decrypted_response)} bytes from server.")
        except Exception as e:
            print(f"[-] Decryption failed for server response: {e}")
            error_page = b"HTTP/1.1 500 Internal Server Error\r\nContent-Type: text/html\r\n\r\n<html><body><h1>500 Internal Server Error</h1><p>Proxy failed to decrypt server response.</p></body></html>"
            try:
                browser_socket.sendall(error_page)
            except socket.error:
                 pass
            return

        try:
            print(f"[<] Sending {len(decrypted_response)} decrypted bytes to browser.")
            browser_socket.sendall(decrypted_response)
            print("[+] Response sent to browser successfully.")
        except socket.error as e:
            print(f"[-] Socket error sending response to browser: {e}")

    except socket.error as e:
        if e.errno == 10054 or e.errno == 10053:
             print(f"[-] Browser connection closed abruptly (Error {e.errno}).")
        else:
             print(f"[-] Socket error during browser handling: {e}")
    except Exception as e:
        print(f"[-] Unexpected error in handle_browser_request: {e}")
    finally:
        print("[-] Closing browser socket.")
        browser_socket.close()

def start_local_proxy():
    """Starts the local proxy server to listen for browser connections."""
    local_server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    local_server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    try:
        local_server.bind((LOCAL_PROXY_IP, LOCAL_PROXY_PORT))
        local_server.listen(5)
        print(f"[*] Local proxy listening on {LOCAL_PROXY_IP}:{LOCAL_PROXY_PORT}")
        print(f"[*] Configure your browser to use HTTP Proxy: {LOCAL_PROXY_IP} Port: {LOCAL_PROXY_PORT}")
    except socket.error as e:
        print(f"[-] Failed to bind or listen on {LOCAL_PROXY_IP}:{LOCAL_PROXY_PORT}. Error: {e}")
        print(f"    Check if port {LOCAL_PROXY_PORT} is already in use.")
        return
    except Exception as e:
         print(f"[-] Unexpected error during local proxy setup: {e}")
         return

    while True:
        try:
            browser_sock, addr = local_server.accept()
            print(f"[*] Accepted connection from browser")
            browser_handler = threading.Thread(target=handle_browser_request, args=(browser_sock,))
            browser_handler.daemon = True
            browser_handler.start()
        except KeyboardInterrupt:
            print("\n[*] Local proxy shutting down.")
            break
        except Exception as e:
            print(f"[-] Error accepting browser connections: {e}")

    local_server.close()
    print("[*] Local proxy socket closed.")

if __name__ == '__main__':
    if 'YOUR_SERVER_PUBLIC_IP_OR_DDNS_HOSTNAME' in REMOTE_SERVER_IP:
         print("[-] ERROR: Please edit client.py and replace 'YOUR_SERVER_PUBLIC_IP_OR_DDNS_HOSTNAME' with the actual server IP or hostname.")
         sys.exit(1)
    if 'PASTE_YOUR_GENERATED_KEY_HERE' in SHARED_SECRET_KEY.decode():
         print("[-] ERROR: Please edit client.py and replace 'PASTE_YOUR_GENERATED_KEY_HERE' with the shared secret key.")
         sys.exit(1)

    start_local_proxy()