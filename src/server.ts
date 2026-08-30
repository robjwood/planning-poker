import { Server, routePartykitRequest } from "partyserver";

const DECK = ["1", "2", "3", "5", "8", "13", "20", "?"];

interface Participant {
  id: string;
  name: string;
  vote: string | null;
}

export class PokerRoom extends Server {
  participants = new Map<string, Participant>();
  hostToken: string | null = null;
  hostConnectionId: string | null = null;
  revealed = false;

  onConnect(connection: any) {
    connection.send(JSON.stringify({ type: "welcome", id: connection.id }));
  }

  onMessage(connection: any, message: string) {
    let data: any;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    if (data.type === "join") {
      const claimedToken = typeof data.hostToken === "string" ? data.hostToken : null;

      if (this.hostToken === null && claimedToken) {
        this.hostToken = claimedToken;
      }
      if (this.hostToken !== null && claimedToken === this.hostToken) {
        this.hostConnectionId = connection.id;
      }

      this.participants.set(connection.id, {
        id: connection.id,
        name: String(data.name || "Anonymous").slice(0, 40),
        vote: null,
      });
      this.broadcastState();
      return;
    }

    const participant = this.participants.get(connection.id);
    if (!participant) return;

    if (data.type === "vote") {
      if (this.revealed) return;
      if (data.value !== null && !DECK.includes(data.value)) return;
      participant.vote = data.value;
      this.broadcastState();
    } else if (data.type === "reveal") {
      if (connection.id !== this.hostConnectionId) return;
      this.revealed = true;
      this.broadcastState();
    } else if (data.type === "reset") {
      if (connection.id !== this.hostConnectionId) return;
      this.revealed = false;
      for (const p of this.participants.values()) p.vote = null;
      this.broadcastState();
    }
  }

  onClose(connection: any) {
    this.participants.delete(connection.id);
    if (connection.id === this.hostConnectionId) {
      this.hostConnectionId = null;
    }
    this.broadcastState();
  }

  broadcastState() {
    const participants = Array.from(this.participants.values()).map((p) => ({
      id: p.id,
      name: p.name,
      hasVoted: p.vote !== null,
      vote: this.revealed ? p.vote : undefined,
    }));

    let average: number | null = null;
    let consensus = false;

    if (this.revealed) {
      const voteValues = participants.map((p) => p.vote).filter((v): v is string => v != null);

      const numericVotes = voteValues.map((v) => Number(v)).filter((n) => !Number.isNaN(n));

      if (numericVotes.length) {
        average = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
      }
      consensus = voteValues.length > 0 && voteValues.every((v) => v === voteValues[0]);
    }

    this.broadcast(
      JSON.stringify({
        type: "state",
        participants,
        revealed: this.revealed,
        hostId: this.hostConnectionId,
        average,
        consensus,
      })
    );
  }
}

export default {
  async fetch(request: Request, env: Record<string, DurableObjectNamespace>) {
    return (
      (await routePartykitRequest(request, env)) ?? new Response("Not found", { status: 404 })
    );
  },
};
