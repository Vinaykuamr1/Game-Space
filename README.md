# Game Area

A browser-based game collection built with React and Spring Boot. It currently includes online UNO and local pass-and-play versions of Ludo, Chess, and Snakes & Ladders.

## Games

- **UNO Arena:** Create or join a room, invite friends with a room code, or play against one to three computer players. Games use server-validated turns and live WebSocket updates.
- **Ludo:** Local pass-and-play for 2–4 players.
- **Chess:** Local two-player chess with legal moves, check/checkmate, castling, and automatic queen promotion.
- **Snakes & Ladders:** Local pass-and-play for 2–4 players.

The last three games run on one device. They do not currently use online rooms.

## Run with Docker Compose

### Requirements

- Docker Desktop running with Linux containers enabled
- An internet connection for downloading Docker images and Java dependencies on the first build

### Setup

1. Clone or download this repository and open a terminal in its folder.
2. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Edit `.env`. Replace the database passwords and `JWT_SECRET` with private, randomly generated values. Keep `.env` on your computer; it is excluded from Git.
4. Build and start the app:

   ```powershell
   docker compose up -d --build
   ```

5. Open [http://localhost:5173](http://localhost:5173).

The first build downloads the required images and libraries and may take several minutes. To inspect service output, use `docker compose logs -f backend` or `docker compose logs -f frontend`. Stop the services with `docker compose down`.

## Play UNO with friends on your Wi-Fi

1. Start the app on the computer hosting the game.
2. In PowerShell, run `ipconfig` and find the active **Wi-Fi IPv4 Address**.
3. Add your current address to `FRONTEND_ORIGINS` in `.env`, for example:

   ```dotenv
   FRONTEND_ORIGINS=http://localhost:5173,http://192.168.1.25:5173
   ```

   Replace `192.168.1.25` with the host computer’s current address.
4. Restart with `docker compose up -d --build`.
5. On the host, open `http://localhost:5173`, create a UNO room, and share its room code.
6. Friends on the same Wi-Fi open `http://<host-ip>:5173`, create accounts or continue as guests, and join the room.

Allow Docker Desktop through Windows Firewall on private networks if prompted. A Wi-Fi address can change, so check it again if friends can no longer connect. This setup is intended for a trusted local network; internet access requires a properly deployed and secured server.

## Accounts and email password recovery

Players can register with an email and password, sign in, or continue as a guest. With SMTP configured, password recovery sends a six-digit code to the email address associated with an account. Configure these `.env` values with your mail provider’s SMTP details:

```dotenv
OTP_DEV_MODE=false
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=your-sender@example.com
MAIL_PASSWORD=your-smtp-app-password
MAIL_FROM=your-sender@example.com
MAIL_SMTP_AUTH=true
MAIL_SMTP_STARTTLS=true
```

Use the SMTP app password or credential required by your provider; do not commit it to Git. If email is not configured, password reset will report that setup is needed. For local development only, `OTP_DEV_MODE=true` displays the reset code in the app instead of sending email. Do not enable that mode on a public server.

## Ports and data

| Service | Address / port | Purpose |
| --- | --- | --- |
| Web app | `http://localhost:5173` | Browser interface |
| Backend API | `localhost:8080` | Spring Boot API and WebSocket endpoint |
| MySQL | `localhost:3307` | Database, named `uno_arena` |

Docker Compose stores MySQL data in the `mysql_data` volume. Account records persist there. UNO rooms and active matches are held in backend memory and are cleared when the backend container restarts. Ludo, Chess, and Snakes & Ladders run locally in the browser while you play.

## Technology

- React, Vite, and JavaScript
- Java 21 and Spring Boot
- MySQL and Spring Data JPA
- Spring Security with JWT authentication
- WebSocket messaging with STOMP and SockJS
- Docker Compose

## Repository notes

- `.env.example` is the safe template for local configuration.
- `.env`, dependency folders, build outputs, and logs are excluded by `.gitignore`.
- Do not commit database credentials, JWT secrets, SMTP passwords, or other private values.
