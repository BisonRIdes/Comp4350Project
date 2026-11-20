# BisonRides Frontend

## Running the frontend

Requires [Node.js](https://nodejs.org/) 20.19+ or 22.12+.

From the `Frontend` folder:

```bash
cp .env.example .env.local   # then set API_KEY (ask the team)
npm install
npm run dev
```

## Messages

Drivers can open a ride's group chat from its edit page; riders can open it from an accepted
ride's details page. The driver can start a personal chat with a registered rider from the group
chat. The Messages page lists accessible conversations, loads older messages, and refreshes the
open conversation every 15 seconds. Participant usernames come from the chat API; messages from
former participants are identified by their user IDs when their usernames are unavailable.

