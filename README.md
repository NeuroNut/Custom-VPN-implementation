# Custom-VPN-implementation
Network Security Project Component
(Presentation completed)

# Simple Secure Proxy Tunnel Project

## Abstract

This project implements a basic secure proxy tunnel designed to demonstrate fundamental network security concepts on Windows. It establishes an encrypted channel between a client machine (potentially on a restricted network) and a server machine (with unrestricted internet access). The client routes specific application traffic (e.g., web browser) through this encrypted tunnel via the server, effectively bypassing local network restrictions and masking the client's IP address from the destination service. The implementation showcases principles of confidentiality through AES encryption, basic authentication via a pre-shared key, data integrity using cryptographic MACs (via Fernet), and secure tunneling using a custom TCP-based proxy mechanism.

## Project Goal

The primary goal is to create a functional, albeit simplified, "VPN-like" solution where a client machine can route its web browser traffic securely through a trusted server machine to access internet resources that might otherwise be blocked. It serves as a practical example of securing data in transit over untrusted networks.

## Features & Network Security Concepts Demonstrated

*   **Confidentiality:** Data transmitted between the client and server is encrypted using AES (specifically via Python's `cryptography.fernet` library), preventing eavesdropping on the traffic between the client and the proxy server.
*   **Authentication (Basic):** A pre-shared secret key is used for encryption and decryption. Only the client and server possessing the correct key can communicate, providing a rudimentary form of mutual authentication.
*   **Data Integrity:** The Fernet symmetric encryption scheme implicitly includes a Message Authentication Code (MAC) with the ciphertext. This helps ensure that the encrypted data hasn't been tampered with during transit between the client and server.
*   **Secure Tunneling (Proxy Method):** The client acts as a local HTTP/HTTPS proxy. Configured browser traffic is intercepted, encapsulated (encrypted), and sent through a dedicated TCP connection to the server. The server then forwards the request to the actual destination, effectively tunneling the browser's traffic.
*   **IP Masking:** The destination web servers see requests originating from the server machine's IP address, not the client's original IP.

## Prerequisites

*   Two Windows Machines (Client and Server)
*   Python 3.x installed on both machines (add Python to PATH)
*   Required Python libraries installed on both machines:
    ```bash
    pip install cryptography requests
    ```
*   Network connectivity allowing the Client machine to reach the Server machine on a specific TCP port (requires Public IP + Port Forwarding on the server, or a tunneling service like `ngrok`, or a mesh VPN like `Tailscale`).

## File Structure

```
secure-proxy-tunnel/
├── server.py       # Server-side script
└── client.py       # Client-side script
```

## File Descriptions

*   **`server.py`**:
    *   Listens for incoming TCP connections from the client on a configured port.
    *   Requires the shared secret key for decryption/encryption.
    *   Receives encrypted data (containing the target URL) from the client.
    *   Decrypts the data using the shared key.
    *   Makes the actual web request (HTTP/HTTPS) to the target URL using the `requests` library.
    *   Encrypts the web response received from the target server.
    *   Sends the encrypted response back to the client.
*   **`client.py`**:
    *   Listens locally on `127.0.0.1` on a configured port (e.g., 8080) acting as an HTTP/HTTPS proxy for the browser.
    *   Requires the shared secret key for encryption/decryption.
    *   Requires the public address (IP/hostname) and port of the running `server.py`.
    *   Receives plain HTTP/HTTPS requests from the browser.
    *   Extracts the target URL.
    *   Encrypts the target URL using the shared key.
    *   Connects and sends the encrypted data to the `server.py`.
    *   Receives the encrypted response from the `server.py`.
    *   Decrypts the response using the shared key.
    *   Forwards the plain, decrypted web response back to the browser.

## Setup Steps

1.  **Generate Shared Key:**
    *   On either machine, open Python and run:
        ```python
        from cryptography.fernet import Fernet
        key = Fernet.generate_key()
        print(key.decode())
        exit()
        ```
    *   Copy the output key string. **Keep this key secure!**

2.  **Configure `server.py`:**
    *   Open `server.py` in a text editor.
    *   Paste the generated key into the `SHARED_SECRET_KEY = b'...'` line (keep the `b''`).
    *   Configure `LISTEN_IP` (often `0.0.0.0` for standard setup, or `127.0.0.1` if using `ngrok`) and `LISTEN_PORT` (e.g., `4433`).

3.  **Configure `client.py`:**
    *   Open `client.py` in a text editor.
    *   Paste the **same** generated key into the `SHARED_SECRET_KEY = b'...'` line.
    *   Set `REMOTE_SERVER_IP` to the public IP address or hostname where the server can be reached (this could be a public IP, DDNS hostname, `ngrok` address, or some other method but we are using ngrok).
    *   Set `REMOTE_SERVER_PORT` to the port the server is listening on (e.g., `4433`).
    *   Set `LOCAL_PROXY_PORT` (e.g., `8080`) - this is the port the client script listens on for the browser.

4.  **Ensuring Server Reachability:**
    *   If the server is behind a router, configure **Port Forwarding** on the router to forward the `LISTEN_PORT` (e.g., 4433) to the server machine's private IP address.
    *   Ensure the server's firewall allows incoming connections on `LISTEN_PORT`.
    *   Alternatively, use `ngrok` or `Tailscale` as described in previous instructions if port forwarding is not possible.

5.  **Run the Server:**
    *   On the server machine, open a command prompt, navigate to the script directory and run:
        ```bash
        python server.py
        ```
    *   Keep this running.

6.  **Run the Client:**
    *   On the client machine, open a command prompt, navigate to the script directory and run:
        ```bash
        python client.py
        ```
    *   Keep this running.

7.  **Configuring Browser Proxy:**
    *   On the client machine, configure your web browser (or system settings) to use an HTTP Proxy.
    *   Set the Proxy **Address/Host** to `127.0.0.1`.
    *   Set the Proxy **Port** to the `LOCAL_PROXY_PORT` configured in `client.py` (e.g., `8080`).
    *   Optionally, apply the proxy setting for HTTPS as well.

## Usage

With both scripts running and the browser configured, simply browse the web as usual. The traffic directed through the proxy will be securely tunneled via the server machine. Check the console output of both scripts to observe the activity. Remember to disable the browser proxy settings when not using the tunnel.

## Limitations

*   **Simplified Proxy:** This implementation is a basic proxy and may not handle all edge cases of HTTP/HTTPS communication correctly.
*   **No OS-Level Tunneling:** Only traffic specifically configured to use the local proxy (`127.0.0.1:8080`) is tunneled. Other applications are unaffected.
*   **Basic Authentication:** Relies solely on a pre-shared key. Compromise of the key compromises the entire channel. No mechanism for key rotation or separate user authentication.
*   **No Perfect Forward Secrecy:** Uses a static symmetric key.
*   **Metadata Exposure:** While data *content* is encrypted between client and server, the connection *to* the server machine (or `ngrok`/Tailscale endpoint) is visible on the client's network.
*   **Server is a Single Point of Failure/Trust:** The server decrypts the traffic before forwarding it. You must trust the server machine.
