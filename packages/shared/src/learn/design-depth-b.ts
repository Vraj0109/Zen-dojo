import type { WalkthroughDeep } from "./design-depth-types";

// Depth for system design walkthroughs (plan 0014). Diagrams are Mermaid, code is Java 17 (compiled by design-code.test.ts).

export const DESIGN_DEPTH_B: Record<string, WalkthroughDeep> = {
  "sdd-news-feed": {
    "architecture": [
      {
        "name": "Post service and post store",
        "role": "Stores each post once (id, author, text, media references, time), sharded by post id or author.",
        "scale": "150 million posts a day is about 1,700 a second. Media goes to object storage and a CDN, so the row stays small.",
        "failure": "Replicated shards keep posts readable. Deleted or hidden posts are filtered at read time because feed caches can still hold their ids."
      },
      {
        "name": "Fan-out workers",
        "role": "On publish, copy the post id into the feed cache of each active follower of an ordinary author. Skip authors above a follower threshold.",
        "scale": "1,700 posts a second times 200 followers is about 340,000 cache writes a second. A celebrity with 50 million followers would need 50 million writes, so they are skipped.",
        "failure": "A backed-up queue delays delivery but loses nothing, since the post is already stored. Fan out to active users first, bound each job's page size and alert on queue age."
      },
      {
        "name": "Feed cache",
        "role": "Per user sorted set of post ids by time, capped at about 800 entries, in Redis.",
        "scale": "300 million users times 800 ids times 8 bytes is about 1.9 TB, a normal Redis cluster size. Cursor paging reads a range below the last seen score.",
        "failure": "If a node dies, feeds are rebuilt on demand with the pull path, and per-user locks avoid a rebuild storm. Replicas make most failures invisible."
      },
      {
        "name": "Feed service and celebrity merge",
        "role": "At read time, takes cached ids, merges recent posts of the few celebrities the user follows and fetches post bodies, dropping deleted or hidden ones.",
        "scale": "35,000 reads a second on average and about 100,000 at peak. The celebrity post list is cached per author for a few seconds, so one read serves a million feeds.",
        "failure": "If the post store is slow, serve cached ids with whatever bodies are available and shorter pages. Fetch a few extra ids to fill the page."
      },
      {
        "name": "Ranking service and feature store",
        "role": "Scores a few hundred candidates by recency, closeness, engagement and predicted interest, then sorts them.",
        "scale": "Runs only on the read candidates, not on the write path, so the model can change without rebuilding feeds.",
        "failure": "If ranking is unavailable, fall back to time order. Like counts use sharded counters flushed in batches to avoid a hot row."
      }
    ],
    "criteria": [
      {
        "area": "Requirements and numbers",
        "strong": "Derives 35,000 to 100,000 feed reads a second, 1,700 posts a second, 200 followers each, and shows that building feeds at read time means 20 million author lookups a second.",
        "weak": "Says millions of users and picks pull or push without a calculation."
      },
      {
        "area": "Fan-out strategy",
        "strong": "Explains push, pull and the hybrid, uses a follower threshold for celebrities and fans out only to active users.",
        "weak": "Pushes for everyone and cannot say what happens when a user has 50 million followers."
      },
      {
        "area": "Feed storage and paging",
        "strong": "Stores ids not posts, caps each feed, sizes it (about 1.9 TB) and pages with a cursor rather than an offset.",
        "weak": "Stores full posts per follower or uses offset paging that repeats items when new posts arrive."
      },
      {
        "area": "Ranking and data model",
        "strong": "Separates candidate generation from ranking, stores follows in both directions and keeps counters outside the post row.",
        "weak": "Puts a heavy model on the write path and cannot say who follows a user without a full scan."
      },
      {
        "area": "Failure and consistency",
        "strong": "Rebuilds lost feeds with the pull path, filters deleted posts at read time and says feeds are eventually consistent while the post store and graph are strongly consistent.",
        "weak": "Promises every follower sees every post instantly, with no plan for a lost cache node."
      }
    ],
    "diagrams": [
      {
        "title": "Components",
        "source": "flowchart LR\n  U[User] --> API[Post API]\n  API --> PS[(Post store)]\n  API --> Q[Fan-out queue]\n  Q --> FW[Fan-out workers]\n  FW --> G[(Social graph)]\n  FW --> FC[(Feed cache per user: list of post ids)]\n  R[Feed API] --> FC\n  R --> PS\n  R --> CP[Celebrity posts store]",
        "caption": "Posts are stored once. A fan-out service copies post ids into followers' feed caches, and the feed service merges in celebrity posts at read time."
      },
      {
        "title": "Publish path",
        "source": "sequenceDiagram\n  participant A as Author\n  participant API as Post API\n  participant DB as Post store\n  participant Q as Queue\n  participant W as Fan-out worker\n  participant C as Feed cache\n  A->>API: create post\n  API->>DB: store post\n  API->>Q: enqueue fan-out job\n  API-->>A: created\n  Q->>W: job for the author\n  W->>W: read followers in pages of 1000\n  W->>C: push the post id to each follower feed, trim to 800",
        "caption": "Writing a post is fast for the author. The expensive copying to followers happens in the background."
      },
      {
        "title": "Read path",
        "source": "sequenceDiagram\n  participant U as Reader\n  participant F as Feed API\n  participant C as Feed cache\n  participant P as Post store\n  U->>F: GET feed\n  F->>C: get post ids\n  F->>P: get celebrity posts since the last read\n  F->>F: merge by time, rank, remove blocked and hidden\n  F->>P: fetch post bodies for the top 20 ids\n  F-->>U: page of posts and a cursor",
        "caption": "A feed read is a cache read plus a merge with the few celebrity authors the user follows."
      }
    ],
    "sections": [
      {
        "title": "Requirements and numbers",
        "body": "A news feed shows a user the recent posts of the people they follow, newest or best first. Two operations dominate: publishing a post and reading a feed. The central problem is that reading is far more frequent than writing, and a feed must come back in under about 200 ms even though it depends on many authors.\n\nTake 300 million daily active users, each opening the feed 10 times a day and posting once every two days. Reads: 3 billion a day, about 35,000 a second on average and perhaps 100,000 at peak. Writes: 150 million posts a day, about 1,700 a second. Suppose the average user follows 200 accounts. Then building a feed at read time means fetching and merging recent posts from 200 authors on every one of 100,000 reads a second, 20 million author lookups a second. That is too much, which is why feeds are precomputed.\n\nStorage: a feed cache entry is only a post id (8 bytes) and maybe a score. Keeping the newest 800 ids for each of 300 million users is 300,000,000 x 800 x 8 = 1.9 TB. That is large but ordinary for a Redis cluster, and far less than the posts themselves, which are stored once in the post store."
      },
      {
        "title": "Fan-out on write, fan-out on read, and the hybrid",
        "body": "**Fan-out on write (push)** copies the post id into the feed cache of every follower at publish time. Reading becomes one cache lookup, which is fast and cheap. The cost is at write time: an author with 1,000 followers causes 1,000 cache writes. For average users that is fine: 1,700 posts a second x 200 followers = 340,000 cache writes a second.\n\n**Fan-out on read (pull)** stores nothing extra at write time and gathers posts from followed authors when the feed is requested. Writes are cheap and always correct, but reads are heavy, as computed above.\n\nPure push breaks for celebrities. An account with 50 million followers would cause 50 million cache writes per post, which takes minutes, wastes work on followers who never open the app, and makes the post appear late for the last followers. The standard answer is a **hybrid**: push for ordinary authors, pull for celebrities. Mark an author as a celebrity above a follower threshold (the demo uses 1,000, real systems use far more). At publish time, skip the fan-out for celebrities. At read time, fetch the precomputed feed and merge in recent posts from the celebrities the user follows. A user follows only a handful of them, so the extra work is small.\n\nThe demo shows exactly this. Alice has 3 followers and posts twice, producing 6 cache writes. The star has 1,500 followers, so their post triggers no writes. When fan0 (who follows both) reads, the feed comes back as `alice#3 star#2 alice#1`: the celebrity post is merged in by time.\n\nTwo more optimisations: only fan out to **active** users (seen in the last 30 days), because pushing to dormant accounts is wasted work, and rebuild a feed on demand for a returning user from the pull path. And keep each feed capped at a few hundred entries: nobody scrolls further, and older items can be fetched from the pull path."
      },
      {
        "title": "Ranking, pagination and the data model",
        "body": "Pure time ordering is easy. Most products rank instead: a score based on recency, the author's closeness to the reader, the post's engagement so far, and a predicted chance of interest. Ranking is a separate stage after candidate generation: the feed service takes the candidate ids from the cache and celebrity merge (a few hundred), asks a ranking service for scores using features from a feature store, and sorts. This keeps the heavy model off the write path and lets you change the model without rebuilding feeds.\n\n**Pagination** must not break when new posts arrive. With offset-based paging, a post added at the top shifts every item down and the next page repeats an item. Use a cursor, the id or score of the last item seen, and ask for items older than it. A feed cache that stores ids in a sorted set by time supports this directly (range by score below the cursor).\n\nThe data model is small. `posts(post_id, author_id, text, media_refs, created_at)` is sharded by post id or by author. `follows(follower_id, followee_id)` needs lookups in both directions: who does X follow (for pull) and who follows X (for fan-out), so store it twice, sharded by each side. Counters (likes, comments) live outside the post row, aggregated in a cache and flushed in batches, because a hot post would otherwise create a write hotspot. Media is stored in object storage and served by a CDN, and the post holds only references.\n\nDeletions and privacy changes matter: when a post is deleted or the author blocks a reader, the feed cache still holds the id. Filter at read time: after fetching post bodies, drop any that no longer exist or are no longer visible, and fetch a few extra ids to fill the page."
      },
      {
        "title": "Failure modes",
        "body": "**A feed cache node dies.** Its users' feeds vanish. The feed service must be able to rebuild a feed on demand with the pull path (read the followed authors' recent posts, merge) and write it back, accepting a slow first read. With replicas of each cache shard, most failures cost nothing. Rebuild storms, thousands of users rebuilding at once, are limited with per-user locks and rate limits so the post store is not overwhelmed.\n\n**The fan-out queue backs up.** A burst of posts, or one slow shard, delays deliveries. Followers see posts late but nothing is lost, since the post is already stored. Priorities help: fan out first to active users and close friends, and give each job a bounded page size so one big author cannot hold a worker for minutes. Alert on queue age, not only length.\n\n**A celebrity posts.** Their post is visible through the read path immediately for everyone. The read path gets heavy briefly, since millions of readers fetch the same new post: cache the celebrity post list per author with a short TTL (seconds), so one store read serves a million feed reads.\n\n**Hot posts and counters.** A viral post gets millions of likes a minute. Count in memory or in a sharded counter (a counter split into N sub-counters, summed on read) and flush to the store in batches.\n\n**Inconsistency is expected.** A follower might see a post a few seconds after others, or a deleted post for a moment. Say that the system is eventually consistent for feeds and strongly consistent only where it must be: the post store and the follow graph updates.\n\n**Regional failure.** Feeds are rebuilt per region from replicated posts and the graph. After failover, caches start cold, so run the rebuild gradually and serve a simpler recent-posts feed first."
      }
    ],
    "code": [
      {
        "name": "FeedFanout.java",
        "code": "import java.util.*;\n\npublic class FeedFanout {\n    record Post(long id, String author, long time) {}\n\n    static final int CELEBRITY_THRESHOLD = 1000;\n    static final Map<String, Set<String>> followers = new HashMap<>();\n    static final Map<String, Deque<Post>> feedCache = new HashMap<>();   // precomputed feeds (fan-out on write)\n    static final Map<String, List<Post>> postsByAuthor = new HashMap<>(); // used for celebrities (fan-out on read)\n    static int writesPerformed = 0;\n\n    static void follow(String follower, String author) {\n        followers.computeIfAbsent(author, k -> new HashSet<>()).add(follower);\n    }\n\n    static boolean isCelebrity(String author) {\n        return followers.getOrDefault(author, Set.of()).size() >= CELEBRITY_THRESHOLD;\n    }\n\n    static void publish(Post p) {\n        postsByAuthor.computeIfAbsent(p.author(), k -> new ArrayList<>()).add(p);\n        if (isCelebrity(p.author())) return;                    // too many followers: do not push\n        for (String f : followers.getOrDefault(p.author(), Set.of())) {\n            Deque<Post> feed = feedCache.computeIfAbsent(f, k -> new ArrayDeque<>());\n            feed.addFirst(p);\n            if (feed.size() > 800) feed.removeLast();           // keep only the newest entries\n            writesPerformed++;\n        }\n    }\n\n    /** Merge the precomputed feed with posts from the celebrities this user follows. */\n    static List<Post> readFeed(String user, Set<String> followedCelebrities, int limit) {\n        List<Post> all = new ArrayList<>(feedCache.getOrDefault(user, new ArrayDeque<>()));\n        for (String c : followedCelebrities) all.addAll(postsByAuthor.getOrDefault(c, List.of()));\n        all.sort(Comparator.comparingLong(Post::time).reversed());\n        return all.subList(0, Math.min(limit, all.size()));\n    }\n\n    public static void main(String[] args) {\n        for (int i = 0; i < 3; i++) follow(\"fan\" + i, \"alice\");\n        for (int i = 0; i < 1500; i++) follow(\"user\" + i, \"star\");\n        follow(\"fan0\", \"star\");\n\n        publish(new Post(1, \"alice\", 10));\n        publish(new Post(2, \"star\", 20));\n        publish(new Post(3, \"alice\", 30));\n        System.out.println(\"fan-out writes for 3 posts: \" + writesPerformed + \" (alice: 3 followers x 2 posts, star: skipped)\");\n        System.out.println(\"star is a celebrity: \" + isCelebrity(\"star\") + \", alice: \" + isCelebrity(\"alice\"));\n        List<Post> feed = readFeed(\"fan0\", Set.of(\"star\"), 10);\n        StringBuilder sb = new StringBuilder();\n        for (Post p : feed) sb.append(p.author()).append('#').append(p.id()).append(' ');\n        System.out.println(\"fan0 feed, newest first: \" + sb.toString().trim());\n    }\n}"
      }
    ]
  },
  "sdd-chat": {
    "architecture": [
      {
        "name": "WebSocket gateways",
        "role": "Hold one long-lived connection per device, authenticate once and forward messages to the chat service.",
        "scale": "100 million concurrent connections at 100,000 to 1 million each means roughly 100 to 1,000 servers. They are stateful, unlike a normal web tier.",
        "failure": "When one dies, around 200,000 connections drop at once. Clients reconnect with backoff and jitter and sync from their last sequence number."
      },
      {
        "name": "Session registry",
        "role": "A Redis hash mapping each user and device to the gateway that holds its connection, with a TTL refreshed by heartbeats.",
        "scale": "One lookup per delivery, so a replicated Redis cluster sharded by user handles hundreds of thousands of lookups a second.",
        "failure": "A stale entry sends to a gateway that no longer holds the connection. The service falls back to store, push and sync later, so a wrong route costs latency, not data."
      },
      {
        "name": "Chat service and sequencer",
        "role": "Appends each message to its conversation's log with the next server-assigned sequence number, dedupes by client message id and fans out to members.",
        "scale": "About 230,000 messages a second on average and 700,000 at peak. All writes for a conversation go to one shard, so the sequence number is a simple counter there.",
        "failure": "If the shard is down, sending for those conversations cannot move elsewhere without risking disorder. Replicate with a quorum and show not sent rather than claim delivery."
      },
      {
        "name": "Message store",
        "role": "A wide-column store (Cassandra or HBase) partitioned by conversation id and bucketed by month, clustered by sequence number.",
        "scale": "20 billion messages a day at about 200 bytes is 4 TB a day and about 1.5 PB a year. Reading the latest 50 messages is a single-partition range read.",
        "failure": "A slow or lost node is hidden by replication. Very active groups are split into time buckets so no partition grows without limit."
      },
      {
        "name": "Fan-out queue and push",
        "role": "Delivers a group message to each member's gateways without blocking the sender's ack, and sends push for offline devices.",
        "scale": "A group of 200 means 200 deliveries, so cap group size or fan out through a queue. Presence is sent only to users with the conversation open.",
        "failure": "Push is best effort and never relied on for correctness: the message is already stored and the app syncs when opened."
      }
    ],
    "criteria": [
      {
        "area": "Requirements and numbers",
        "strong": "Gets 230,000 messages a second average, 4 TB a day and about 100 million concurrent connections, and turns them into gateway and storage sizing.",
        "weak": "Says a lot of users and picks a database before looking at message volume."
      },
      {
        "area": "Ordering and duplicates",
        "strong": "Uses a server-assigned sequence number per conversation and a client message id for idempotent retries, instead of device timestamps.",
        "weak": "Sorts by sender timestamps, so different devices show different orders, and retries create duplicates."
      },
      {
        "area": "Connections and delivery",
        "strong": "Explains WebSocket gateways, a session registry with heartbeats, an offline path, and catch-up by last seen sequence number.",
        "weak": "Uses polling for every client or has no plan for offline devices and new devices."
      },
      {
        "area": "Storage and groups",
        "strong": "Partitions by conversation, stores one copy per conversation with a read pointer per member, and bounds fan-out and partition size.",
        "weak": "Stores a copy of every message per recipient and cannot compute read receipts cheaply."
      },
      {
        "area": "Failure and reconnect storms",
        "strong": "Covers a gateway loss, stale registry, a slow shard and reconnect floods with jitter, and keeps push as best effort only.",
        "weak": "Assumes connections never drop and does not say what happens when a whole gateway goes down."
      }
    ],
    "diagrams": [
      {
        "title": "Components",
        "source": "flowchart LR\n  C1[Client A] <--> GW1[Gateway 1: WebSocket connections]\n  C2[Client B] <--> GW2[Gateway 2]\n  GW1 --> CS[Chat service]\n  GW2 --> CS\n  CS --> MS[(Message store by conversation)]\n  CS --> SR[(Session registry: user to gateway)]\n  CS --> PN[Push notification service]\n  CS --> GW2",
        "caption": "Clients hold a connection to a gateway. Messages go through a chat service that stores them and routes them to the recipient's gateway."
      },
      {
        "title": "Sending a message",
        "source": "sequenceDiagram\n  participant A as Sender\n  participant G1 as Gateway 1\n  participant S as Chat service\n  participant DB as Message store\n  participant G2 as Gateway 2\n  participant B as Recipient\n  A->>G1: send message with client id\n  G1->>S: forward\n  S->>DB: append, assign conversation sequence number\n  S-->>A: stored, sequence number\n  S->>G2: deliver to the recipient gateway\n  G2->>B: message\n  B-->>G2: ack\n  G2-->>S: delivered\n  S-->>A: delivered receipt",
        "caption": "The server stores the message and assigns its order before delivering it. The sender sees a single tick when the server has it, and two when it reaches the device."
      },
      {
        "title": "Offline recipient",
        "source": "sequenceDiagram\n  participant S as Chat service\n  participant R as Session registry\n  participant P as Push service\n  participant B as Recipient device\n  S->>R: where is user B\n  R-->>S: not connected\n  S->>P: push notification, new message\n  P->>B: wake the app\n  B->>S: connect, sync since sequence 41\n  S-->>B: messages 42 to 47",
        "caption": "If the recipient is not connected, the message waits in the store and a push notification wakes the app, which then syncs from its last sequence number."
      }
    ],
    "sections": [
      {
        "title": "Requirements and numbers",
        "body": "A chat system delivers messages between two users or inside groups with low latency, never loses a message, shows messages in a consistent order, and works across the user's devices, including when they are offline. Details that change the design: group size limits (a few hundred or thousands), whether history is stored forever, end-to-end encryption, and presence (\"online\", \"typing\").\n\nEstimates: 500 million daily users send 40 messages a day, which is 20 billion messages a day, about 230,000 a second on average and 700,000 at peak. A message averages 100 bytes of text plus 100 bytes of metadata, so 20 billion x 200 bytes = 4 TB a day, about 1.5 PB a year. That volume rules out a single database, and it points at a store sharded by conversation, where all messages of one conversation sit together and are read in order.\n\nConnections: 500 million users, perhaps 100 million online at once. A gateway server can hold about 100,000 to a million idle WebSocket connections if tuned (memory per connection of a few KB), so 100 million connections need roughly 100 to 1,000 gateway servers. Connections are long-lived and stateful, which makes the gateway tier different from a normal stateless web tier."
      },
      {
        "title": "Connections, routing and ordering",
        "body": "The client keeps one persistent connection, usually a WebSocket, to a gateway. Polling would waste bandwidth and add latency. The gateway authenticates once, then forwards messages to the chat service. The **session registry** (a Redis hash or similar) maps each user and device to the gateway that currently holds its connection, with a TTL refreshed by heartbeats. To deliver a message, the chat service looks up the recipient's gateways and sends the message to each. For a group, it loops over the members, which is why group size must be capped or messages fanned out through a queue.\n\n**Ordering** is the subtle part. Different devices, with different clocks, must show the same order. Use a **server-assigned sequence number per conversation**: the chat service appends the message to the conversation's log and gives it the next number. Everyone sorts by that number, not by the sender's timestamp. If a conversation's writes all go to one shard, assigning the number is simple (a counter in that shard); a conversation is the natural unit of partitioning.\n\n**Retries and duplicates.** A phone on a bad network may send a message, lose the connection before the acknowledgement, and send again. The client therefore attaches a unique client message id, and the server remembers which ids it has stored, returning the existing sequence number on a repeat. The demo shows it: two messages get sequence numbers 1 and 2, a retry of the first returns 1 and adds nothing (the log still has 3 messages after the next one), and a new message gets 3.\n\n**Catching up.** A device that reconnects asks for everything after its last seen sequence number. The demo's device that last saw message 1 receives messages 2 and 3. This one mechanism handles offline users, new devices and gaps after a dropped connection."
      },
      {
        "title": "Storage, groups, presence and receipts",
        "body": "Messages are append-heavy, read by conversation in order, and rarely updated. A wide-column store such as Cassandra or HBase fits: partition key is the conversation id, clustering key is the sequence number, so reading the latest 50 messages is a single-partition range read. A very active group can create a huge partition, so bucket by time (conversation id plus month) and keep the active bucket small. Old history can move to cheaper storage.\n\n**Groups.** Sending to a group of 200 means 200 deliveries. Do the fan-out in the chat service through a queue so the sender's ack does not wait for it. Store one copy of the message per conversation, not per recipient, and track each member's read position (a sequence number) separately. That makes \"read receipts\" a tiny per-member counter instead of a row per message. Very large groups and channels behave more like a feed and use fan-out on read.\n\n**Presence and typing indicators** are the most expensive features per unit of value. Each connect and disconnect, multiplied by all of a user's friends, is a flood. Reduce it: send presence only to users who currently have the conversation open, batch changes over a few seconds, treat \"last seen\" as approximate, and make typing indicators ephemeral messages that are never stored.\n\n**Receipts.** Three states: sent (the server stored it), delivered (the device acknowledged), read (the user opened the conversation). Each is a small event routed back to the sender, and read state is just the member's read pointer.\n\n**End-to-end encryption** changes the server's role: it stores and routes ciphertext it cannot read, so it cannot offer server-side search or content moderation, and multi-device support needs per-device keys (the Signal protocol design). Mention it as a requirement to clarify, then describe the design without it unless asked."
      },
      {
        "title": "Failure modes",
        "body": "**A gateway dies.** All its connections, perhaps 200,000, drop at once. Clients reconnect with exponential backoff and jitter to avoid a stampede on the remaining gateways, and sync from their last sequence number, so nothing is lost. Capacity planning keeps spare room: if one of ten gateways fails, the other nine take 11 percent more each, which is fine, but losing a whole zone is not unless planned.\n\n**The session registry is stale.** The chat service may send to a gateway that no longer holds the connection. The gateway reports a failure, the service falls back to the offline path (store, push, sync later), and the registry entry is cleaned up. Because messages are stored first, a wrong route costs latency, not data.\n\n**A message store shard is slow or down.** Writes for the conversations on it fail or queue. Because the sequence number is assigned there, sending cannot continue elsewhere without risking disorder. Replicate the shard with a quorum so one node loss is invisible, and fail the send visibly (the client shows \"not sent, retry\") rather than claim delivery.\n\n**Duplicate delivery.** Acks can be lost, so a recipient may receive a message twice. The client deduplicates by sequence number and ignores one it already has.\n\n**Thundering herd at reconnect.** After a regional network problem, millions reconnect together. Rate-limit connection setup per gateway, spread reconnects with jitter, and keep the sync call cheap (a range read from the latest position).\n\n**Push notification failures.** Push is best-effort. Never rely on it for correctness: the message is in the store, and the app syncs when opened.\n\n**Abuse.** Rate-limit senders per user and per conversation, and apply spam checks before fan-out so one bad actor cannot send to a million users."
      }
    ],
    "code": [
      {
        "name": "ChatSequence.java",
        "code": "import java.util.*;\n\npublic class ChatSequence {\n    record Message(String conversation, long seq, String sender, String text) {}\n\n    /** The server assigns a per-conversation sequence number, which defines the order everyone sees. */\n    static class ConversationLog {\n        private final List<Message> log = new ArrayList<>();\n        private final Map<String, Long> seqByClientMsgId = new HashMap<>(); // dedupe retries\n        private long nextSeq = 1;\n\n        synchronized long append(String conv, String sender, String clientMsgId, String text) {\n            Long existing = seqByClientMsgId.get(clientMsgId);\n            if (existing != null) return existing;                 // a retry of a message we already stored\n            long seq = nextSeq++;\n            log.add(new Message(conv, seq, sender, text));\n            seqByClientMsgId.put(clientMsgId, seq);\n            return seq;\n        }\n\n        synchronized List<Message> since(long lastSeenSeq) {   // what a reconnecting device asks for\n            List<Message> out = new ArrayList<>();\n            for (Message m : log) if (m.seq() > lastSeenSeq) out.add(m);\n            return out;\n        }\n    }\n\n    public static void main(String[] args) {\n        ConversationLog c = new ConversationLog();\n        long a = c.append(\"c1\", \"ana\", \"ana-1\", \"hi\");\n        long b = c.append(\"c1\", \"ben\", \"ben-1\", \"hello\");\n        long retry = c.append(\"c1\", \"ana\", \"ana-1\", \"hi\");       // network retry of the first message\n        long d = c.append(\"c1\", \"ana\", \"ana-2\", \"how are you\");\n        System.out.println(\"sequence numbers: \" + a + \", \" + b + \", retry of first -> \" + retry + \", next -> \" + d);\n        System.out.println(\"log size after a retry: \" + c.since(0).size());\n        System.out.print(\"device that last saw seq 1 catches up on:\");\n        for (Message m : c.since(1)) System.out.print(\" [\" + m.seq() + \" \" + m.sender() + \": \" + m.text() + \"]\");\n        System.out.println();\n    }\n}"
      }
    ]
  },
  "sdd-video": {
    "architecture": [
      {
        "name": "Upload service and object storage",
        "role": "Clients upload with resumable multipart uploads straight to object storage through pre-signed URLs, and the video moves through uploaded, processing and ready.",
        "scale": "500 hours of video a minute is 30,000 hours a day, about 30 TB a day of source at 1 GB an hour.",
        "failure": "A dropped connection resumes from the last part. A video is only published when its renditions are ready, so viewers never see a half-processed one."
      },
      {
        "name": "Transcoding pipeline and orchestrator",
        "role": "Splits the video into chunks at keyframes, encodes chunks and renditions in parallel (5 to 8 steps, 240p to 4K), packages segments and a manifest, and tracks the task graph.",
        "scale": "About 100 TB a day stored with five renditions. Use spot machines for bulk work and a priority queue so short uploads are not stuck behind a three-hour film.",
        "failure": "Tasks are idempotent, so a failed chunk is retried on another worker. A repeatedly failing video goes to a dead-letter state with an alert, and corrupt sources fail fast."
      },
      {
        "name": "Segment and manifest store",
        "role": "Holds HLS or DASH segments of about 2 to 10 seconds per rendition, plus a manifest per video. The manifest is written last as the commit point.",
        "scale": "Tiered storage keeps recent and popular renditions on fast storage and old ones cheaper, regenerating rare renditions on demand.",
        "failure": "A manifest that names a missing segment breaks playback midway, so write all segments before the manifest."
      },
      {
        "name": "CDN with origin shield",
        "role": "Serves segments as plain static files from edge caches, with regional tiers and an origin shield that collapses requests for the same segment.",
        "scale": "A billion hours a day at 3 Mbit/s is about 4 PB a day, an average of 400 Gbit/s and several times that at peak. Nearly all of it must come from the edge.",
        "failure": "If an edge fails, the player switches host, and multi-CDN setups steer by health and cost. A viral new video is protected by request collapsing and pre-pushing to edges."
      },
      {
        "name": "Player (adaptive bitrate)",
        "role": "Fetches the manifest and picks each next segment's quality from measured throughput and buffer level, stepping down fast and up slowly.",
        "scale": "Starts at low quality with small first segments so playback begins within a couple of seconds.",
        "failure": "A stall is the worst outcome, so the buffer rule favours lower quality. View counts use a separate stream aggregation path, not one database update per view."
      }
    ],
    "criteria": [
      {
        "area": "Two-problem framing",
        "strong": "Separates heavy asynchronous processing at upload from high-volume, latency-sensitive delivery, and says compute is spent once so playback is cheap file serving.",
        "weak": "Treats it as one pipeline and proposes serving video from application servers."
      },
      {
        "area": "Numbers",
        "strong": "Derives about 30 TB a day of uploads, about 100 TB with renditions and 4 PB a day of delivery, concluding that the CDN must serve nearly everything.",
        "weak": "Gives round figures with no egress calculation, so the CDN looks optional."
      },
      {
        "area": "Transcoding design",
        "strong": "Chunks at keyframes, encodes chunks and renditions in parallel with idempotent tasks, publishes low renditions first and uses resumable pre-signed uploads.",
        "weak": "Encodes the whole file on one machine and publishes only when all work is done."
      },
      {
        "area": "Adaptive streaming and CDN",
        "strong": "Explains segments, manifest and buffer-based quality choice, with edge, regional and origin shield tiers and request collapsing.",
        "weak": "Streams one file at one quality and ignores network changes and cache misses."
      },
      {
        "area": "Operations and risk",
        "strong": "Covers the manifest as commit point, takedown by purging caches by video id, multi-CDN failover and cost per viewing hour.",
        "weak": "Ignores copyright checks, takedown speed and the fact that egress dominates the bill."
      }
    ],
    "diagrams": [
      {
        "title": "Upload and processing pipeline",
        "source": "flowchart TD\n  U[Creator uploads] --> OS[(Raw video in object storage)]\n  OS --> SP[Splitter: cut into chunks at keyframes]\n  SP --> T1[Transcode 240p]\n  SP --> T2[Transcode 480p]\n  SP --> T3[Transcode 720p]\n  SP --> T4[Transcode 1080p]\n  T1 --> PK[Packager: segments and manifest]\n  T2 --> PK\n  T3 --> PK\n  T4 --> PK\n  PK --> CD[(Renditions in object storage)]\n  PK --> MD[(Metadata store: ready, thumbnails)]",
        "caption": "An uploaded video is split into chunks, converted to several resolutions in parallel, and published only when every rendition is ready."
      },
      {
        "title": "Playback",
        "source": "sequenceDiagram\n  participant P as Player\n  participant API as Video API\n  participant E as CDN edge\n  participant O as Origin storage\n  P->>API: GET video info\n  API-->>P: manifest url, available qualities\n  P->>E: GET manifest\n  E-->>P: list of segments per quality\n  loop every few seconds\n    P->>E: GET next segment at the chosen quality\n    alt edge cache miss\n      E->>O: fetch segment\n      O-->>E: segment\n    end\n    E-->>P: segment\n    P->>P: measure throughput, pick the next quality\n  end",
        "caption": "The player downloads a manifest, then fetches short segments from a nearby CDN edge, switching quality as the network changes."
      },
      {
        "title": "Adaptive bitrate decision",
        "source": "flowchart TD\n  A[Segment downloaded] --> B[Update throughput estimate and buffer length]\n  B --> C{Buffer below 5 seconds?}\n  C -- yes --> D[Step down one quality level]\n  C -- no --> E{Throughput above the next level bitrate by a safe margin and buffer above 15 seconds?}\n  E -- yes --> F[Step up one level]\n  E -- no --> G[Stay at the current level]",
        "caption": "The player estimates throughput and its buffer, and moves up or down a quality level only when it is safe."
      }
    ],
    "sections": [
      {
        "title": "Requirements and numbers",
        "body": "A video platform lets creators upload videos and lets viewers stream them smoothly on any device and network. The design splits cleanly into two problems with different shapes: a heavy, asynchronous **processing** pipeline for uploads, and a very high-volume, latency-sensitive **delivery** path for playback.\n\nNumbers: suppose 500 hours of video are uploaded every minute (a figure often quoted for the largest platforms) and a billion hours are watched a day. Upload: 500 hours a minute is 30,000 hours a day. At 1 GB per hour of source video that is 30 TB a day of raw uploads, but with five renditions of the output the stored volume is several times larger, around 100 TB a day, or tens of petabytes a year. Delivery: a billion hours a day at an average 3 Mbit/s is 3 x 10^9 x 3,600 x 3 / 8 = about 4 x 10^15 bytes, 4 PB a day, an average of 400 Gbit/s sustained and several times that at peak. No origin could serve this: nearly all of it must come from CDN caches close to viewers.\n\nThis asymmetry explains the design: spend compute once at upload time (transcoding is expensive but done once per video), so that playback is cheap file serving from the edge."
      },
      {
        "title": "Transcoding and the pipeline",
        "body": "Viewers have different screens and networks, so each video is converted into several **renditions**: resolutions such as 240p, 480p, 720p, 1080p and 4K, each at a bitrate (roughly 0.4, 1, 2.5, 5 and 15 Mbit/s) and in codecs such as H.264 for compatibility and VP9 or AV1 for better compression on supported devices. A rendition ladder with 5 to 8 steps is typical.\n\nTranscoding is CPU heavy: encoding 1 hour of 1080p can take an hour or more on one core. The fix is parallelism. Split the video into **chunks** at keyframe boundaries (a few seconds to a minute each), encode chunks and renditions in parallel on many workers, and stitch the results. A workflow orchestrator tracks the graph of tasks (split, encode per chunk per rendition, package, thumbnails, content checks), retries failed tasks and records state. Because tasks are idempotent (same input, same output), a retry after a crashed worker is safe. Use spot or preemptible machines for the bulk of the work to cut cost, and a priority queue so a short creator upload is not stuck behind a three-hour film.\n\n**Packaging** cuts each rendition into small segments of about 2 to 10 seconds in a streaming format (HLS or MPEG-DASH) and writes a manifest listing the segments for each quality. Small segments are the key to adaptive streaming: the player can change quality at every segment boundary. Other outputs include thumbnails, a preview clip, captions and audio tracks.\n\nThe upload path itself needs care. Large files are sent with **resumable multipart uploads** directly to object storage using a pre-signed URL, so the upload does not pass through application servers and can resume after a network drop. Publishing happens only when the renditions are ready, with a state machine: uploaded, processing, ready (or failed), so viewers never see a half-processed video."
      },
      {
        "title": "Delivery, CDN and adaptive bitrate",
        "body": "Playback uses **HTTP adaptive streaming**. The player fetches the manifest, then requests segments one after another over ordinary HTTP. Because segments are plain static files, they are cacheable by any CDN, with no special streaming servers. The player measures how fast each segment arrived and how much video it has buffered, and picks the quality of the next segment. A simple rule, shown in the diagram: step down fast when the buffer is low (to avoid stalling, the worst experience), and step up slowly when throughput clearly exceeds the next level's bitrate and the buffer is healthy. More advanced players model the buffer as a control problem to avoid oscillating between levels.\n\n**The CDN** is where cost and latency are decided. Popular videos stay in edge caches; the long tail of rarely watched videos misses and is fetched from the origin, so the hit ratio is the key metric. Tiers of caches (edge, regional, origin shield) reduce origin load: a miss at one edge can be served from a regional cache that already has it. Large platforms place their own cache servers inside ISP networks, so most traffic never crosses the wider internet. Popularity is very skewed, so a small share of videos produces most traffic, and new popular videos can be **pre-pushed** to edges before the audience arrives.\n\nStart-up time matters: viewers abandon after a couple of seconds. Start at a low quality to begin playing quickly (small first segments), then move up. Keep the manifest small and cacheable.\n\nStorage tiering saves money: recent and popular renditions on fast storage, old and rarely viewed ones in cheaper tiers, and perhaps only the most-used renditions kept for old videos, regenerated on demand for the rest.\n\nMetadata (title, owner, counts, comments, recommendations) lives in ordinary databases and caches, separate from the media. View counts are written through a stream aggregation pipeline, not a database update per view."
      },
      {
        "title": "Failure modes",
        "body": "**A transcoding worker or whole job fails.** Tasks are idempotent and tracked by the orchestrator, so failed chunks are retried on another worker. A video that fails repeatedly goes to a dead-letter state with an alert and a message to the creator. A bad source file (corrupt, unsupported codec) must fail fast with a clear error, not retry forever.\n\n**The pipeline backs up.** After a surge of uploads, processing delay grows. Publish the lowest renditions first (a 360p version is ready in minutes) so the video becomes watchable early, and finish the rest later. Scale workers on queue age, and reserve capacity for short videos.\n\n**A CDN edge or a provider has a problem.** Players must be able to switch to another edge or another CDN: the manifest can list multiple hosts, and the API can steer by health and cost. Multi-CDN setups are common at large scale for this reason.\n\n**Origin overload from cache misses.** A new video that suddenly goes viral hits many edges at once, and every edge asks the origin for the same segments. Request collapsing (one origin fetch per segment, other requests wait) and an origin shield prevent a stampede.\n\n**Corrupted or missing segments.** A manifest that names a segment not yet uploaded makes playback fail midway. Write all segments first and the manifest last, and treat the manifest as the commit point.\n\n**Copyright and abuse.** Run content fingerprinting and policy checks in the pipeline before publishing, and support fast takedown, which means purging CDN caches by video id, not waiting for TTLs.\n\n**Cost surprises.** Egress dominates the bill. Track cost per viewing hour, use efficient codecs, and cap quality for logged-out or low-value traffic if needed."
      }
    ]
  },
  "sdd-file-sync": {
    "architecture": [
      {
        "name": "Client sync agent",
        "role": "Watches the folder with a file system watcher plus a periodic scan, splits files into 4 MB chunks, hashes them and uploads only chunks the server lacks.",
        "scale": "Uploads several chunks in parallel to fill the link. Content-defined chunking means a small insert changes only the chunks near it (5 new of 67 in the demo).",
        "failure": "A crash mid-upload leaves harmless unreferenced chunks. On restart the client asks which chunks the server needs and resumes."
      },
      {
        "name": "Metadata service",
        "role": "Stores names, folders, versions and the ordered chunk list per version, and accepts a commit only if its base version is still the latest.",
        "scale": "About 200 bytes per file version, so about 100 TB for 100 million users with 1,000 files and 5 versions each, sharded by user or namespace.",
        "failure": "A rejected commit becomes a conflicted copy instead of an overwrite. The server checks every chunk exists before inserting a version, so a version never points at missing data."
      },
      {
        "name": "Chunk store",
        "role": "Object storage addressed by content hash, with global deduplication, encryption at rest and replication or erasure coding.",
        "scale": "100 million users at 10 GB each is about 1 EB, so deduplication and cold tiers are the main cost levers. Durability targets about 11 nines.",
        "failure": "Corruption is detectable because the name is the hash. Scrub in the background and repair from replicas."
      },
      {
        "name": "Notification service",
        "role": "A long poll or WebSocket per device that says something changed. The client then asks for changes after its cursor.",
        "scale": "About 200 million changes a day, 2,300 a second on average. The message carries no data, so it stays small and stateless about content.",
        "failure": "A change in a folder shared with 10,000 people makes 10,000 notifications, so coalesce to at most one per device per short interval."
      },
      {
        "name": "Garbage collector",
        "role": "Removes chunks no retained version refers to, using reference counts or mark and sweep after a safety delay of days.",
        "scale": "Runs as a separate, throttled and audited process that can be paused.",
        "failure": "The most dangerous bug in the system: deleting a chunk too early destroys user data. Keep a grace period and never delete immediately."
      }
    ],
    "criteria": [
      {
        "area": "Metadata and data split",
        "strong": "Separates transactional metadata from immutable chunks stored by hash, and says a file version is just an ordered chunk list.",
        "weak": "Stores whole files in a relational database or re-uploads a 2 GB file for a one-line change."
      },
      {
        "area": "Chunking and dedup",
        "strong": "Uses 4 MB chunks, content-defined cut points to survive inserts, global dedupe and names the privacy risk of hash probing.",
        "weak": "Uses fixed chunks without noticing that one inserted byte changes every later chunk."
      },
      {
        "area": "Sync and conflicts",
        "strong": "Uses a cursor and long poll to learn about changes, optimistic concurrency on the base version and a conflicted copy instead of a silent overwrite.",
        "weak": "Uses last-write-wins timestamps, which loses one device's work and trusts device clocks."
      },
      {
        "area": "Commit and data safety",
        "strong": "Makes the commit the point where all chunks must exist, resumes uploads and delays garbage collection by days.",
        "weak": "Deletes unreferenced chunks at once, or commits before the data is stored."
      },
      {
        "area": "Scale and sharing",
        "strong": "Shards metadata by user or namespace, coalesces notification storms for shared folders and gets cheap version history from chunk lists.",
        "weak": "Ignores sharing and treats the 1 EB of data as an afterthought."
      }
    ],
    "diagrams": [
      {
        "title": "Components",
        "source": "flowchart LR\n  D1[Device 1: sync client] --> API[Sync API]\n  D2[Device 2: sync client] --> API\n  API --> MS[(Metadata store: files, versions, block lists)]\n  D1 --> BS[(Block storage: chunks by hash)]\n  D2 --> BS\n  API --> NS[Notification service: long poll or push]\n  NS --> D2",
        "caption": "Clients talk to a metadata service for what changed and to block storage for the data. A notification service tells other devices to sync."
      },
      {
        "title": "Uploading a change",
        "source": "sequenceDiagram\n  participant C as Client\n  participant A as Sync API\n  participant B as Block storage\n  participant M as Metadata store\n  C->>C: split the file into chunks, hash each one\n  C->>A: which of these chunk hashes do you need\n  A-->>C: need chunks 4 and 5\n  C->>B: upload chunks 4 and 5\n  C->>A: commit version with chunk list and base version\n  A->>M: check the base version is still current, insert the new version\n  A-->>C: committed\n  A-->>C: notify other devices",
        "caption": "The client sends only the chunks the server does not already have, then commits a new file version that lists them."
      },
      {
        "title": "Conflict",
        "source": "sequenceDiagram\n  participant A as Device A\n  participant S as Server\n  participant B as Device B\n  Note over A,B: both start from version 7\n  A->>S: commit version 8, base 7\n  S-->>A: accepted\n  B->>S: commit, base 7\n  S-->>B: rejected, the current version is 8\n  B->>B: save a conflicted copy, fetch version 8\n  B->>S: commit the copy as a new file",
        "caption": "Two devices edit the same base version. The second commit is refused, and the client keeps both files as a conflicted copy."
      }
    ],
    "sections": [
      {
        "title": "Requirements and numbers",
        "body": "A file sync service (Dropbox, Google Drive style) keeps a folder identical across a user's devices and shares folders with others. The requirements that shape the design: files may be large (gigabytes), edits are usually small, networks are unreliable, users edit offline, and **no data may be lost**, even when two devices change the same file.\n\nEstimates: 100 million users with 10 GB each is 1 EB (exabyte) of data, which makes deduplication and storage cost a main concern. If 10 percent of users are active daily and each syncs 20 changes, that is 200 million changes a day, 2,300 a second on average. Metadata is small (200 bytes per file version); with 100 million users x 1,000 files x 5 versions, that is about 100 TB of metadata, which still needs sharding by user.\n\nThe key idea: separate **metadata** (names, folders, versions, which chunks make up a file) from **data** (the chunks). Metadata needs transactions and low latency. Data is large, immutable and stored by content hash, so object storage fits."
      },
      {
        "title": "Chunking, deduplication and delta sync",
        "body": "Sending a 2 GB file again after changing one line would be absurd. The client splits each file into **chunks** (4 MB is common), hashes each with SHA-256 and uploads only chunks the server does not already hold. A file version is just an ordered list of chunk hashes. Changing the middle of a file changes only the chunks that contain the change.\n\nFixed-size chunks have a weakness: **inserting** a byte near the start shifts every later byte, so all following chunks change. **Content-defined chunking** fixes this by choosing cut points from the data itself: slide a rolling hash over the bytes and cut when the hash matches a pattern, so cut points depend on local content, and an insertion only disturbs the chunks around it. The demo uses a small version of this. A short repetitive text splits into 67 chunks (54 distinct, since the lines repeat). After inserting a few characters at the very start, the second version has 67 chunks but only 5 are new, so only those would be uploaded.\n\nBecause chunks are addressed by hash, **deduplication** is automatic and global: if a million users hold the same installer, the system stores its chunks once. The cost is privacy: a client could learn whether the service already has a file by asking about its hash. Services mitigate this by proving the client has the data (a challenge on random chunk ranges) before granting access to a known hash, or by limiting cross-user dedupe.\n\nChunks are encrypted at rest and often compressed before upload. Chunk storage uses replication or erasure coding for durability (11 nines is a common target), with cold chunks moved to cheaper tiers.\n\nFor large uploads the client uses resumable uploads per chunk, so a dropped connection loses at most one chunk, and uploads several chunks in parallel to fill the network link."
      },
      {
        "title": "Sync protocol, notifications and conflicts",
        "body": "Each device remembers the last metadata **cursor** it has seen (a version number of the user's namespace). To sync it asks \"what changed since cursor N\" and receives a list of file changes in order. To learn when to ask, the client keeps a **long poll** or WebSocket to a notification service: the server holds the request open and replies when something changes. The notification carries no data, only \"something changed\", and the client then pulls the changes. This keeps the notification service simple and stateless about content.\n\nLocal changes are detected with a file system watcher (inotify, FSEvents, ReadDirectoryChangesW) plus a periodic scan for safety, because watchers can miss events. A rename or move is a metadata change only, so no data is re-uploaded.\n\n**Conflicts** are unavoidable with offline editing. Each commit names the version it was based on. The metadata service accepts a commit only if that base is still the latest, an optimistic concurrency check, as the diagram shows. Device B's commit is refused because device A already moved the file to version 8. Silent overwriting would lose A's work, so B saves its edit as a **conflicted copy** (`report (B's conflicted copy).docx`) and the user merges by hand. For plain-text documents, real-time collaborative editing (see the collaborative editing design) avoids the problem by merging changes automatically.\n\n**Sharing** adds a permission model: folders belong to a namespace, shared with users by ACL entries, and a shared folder appears in each member's tree. Notifications go to every member's devices. **Versions** are cheap, because a new version is a new chunk list pointing at mostly existing chunks, which gives version history and undelete almost for free; a retention policy decides how long old versions and unreferenced chunks are kept before **garbage collection** removes chunks no version refers to."
      },
      {
        "title": "Failure modes",
        "body": "**A client uploads some chunks, then crashes.** The chunks are stored but no version points to them, which is harmless. On restart the client asks again which chunks the server needs and resumes. Unreferenced chunks are reclaimed by garbage collection after a grace period, never immediately, because another client may be about to reference them.\n\n**Commit and data out of order.** The commit must happen only after all chunks are stored. The server verifies that every chunk in the list exists before inserting the version, so a version can never point at missing data. This is the commit point of the whole design.\n\n**Garbage collection deletes a chunk too early.** This is the most dangerous bug in the system, because it destroys user data. Use reference counts or mark-and-sweep with a safety delay (days), keep chunks referenced by any retained version, and make deletion a separate, audited process with the ability to pause.\n\n**The metadata store is the bottleneck.** Shard by user (or namespace) so one user's operations stay within a shard and transactions remain local. A shared folder belongs to one namespace shard, and members' views refer to it. Hot shared folders with thousands of members need batching of notifications.\n\n**Notification storms.** A change in a folder shared with 10,000 people creates 10,000 notifications. Coalesce: notify each device at most once per short interval, and let it pull everything new.\n\n**Corruption and bit rot.** Verify chunk hashes on upload, on download and periodically in the background (scrubbing), and repair from replicas. Because a chunk's name is its hash, corruption is detectable by construction.\n\n**Clock and rename races.** Do not rely on timestamps for ordering; use server-assigned version numbers. Two devices renaming the same file to different names produce a conflict, resolved the same way as content conflicts."
      }
    ],
    "code": [
      {
        "name": "ChunkDedupe.java",
        "code": "import java.nio.charset.StandardCharsets;\nimport java.security.MessageDigest;\nimport java.util.*;\n\npublic class ChunkDedupe {\n    static final int MIN = 16, MAX = 64, MASK = 0x0F; // small chunks for the demo; real systems use kilobytes\n\n    /** Content-defined chunking: cut where a hash of the recent bytes matches a pattern, so an edit only moves nearby cuts. */\n    static List<byte[]> chunk(byte[] data) {\n        List<byte[]> out = new ArrayList<>();\n        int start = 0, h = 0;\n        for (int i = 0; i < data.length; i++) {\n            h = (h * 31 + (data[i] & 0xFF)) & 0x7FFFFFFF;\n            int len = i - start + 1;\n            if ((len >= MIN && (h & MASK) == MASK) || len >= MAX) {\n                out.add(Arrays.copyOfRange(data, start, i + 1));\n                start = i + 1;\n                h = 0;\n            }\n        }\n        if (start < data.length) out.add(Arrays.copyOfRange(data, start, data.length));\n        return out;\n    }\n\n    static String sha(byte[] b) throws Exception {\n        byte[] d = MessageDigest.getInstance(\"SHA-256\").digest(b);\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < 4; i++) sb.append(String.format(\"%02x\", d[i]));\n        return sb.toString();\n    }\n\n    public static void main(String[] args) throws Exception {\n        StringBuilder text = new StringBuilder();\n        for (int i = 0; i < 40; i++) text.append(\"line \").append(i).append(\": the quick brown fox jumps over the lazy dog. \");\n        byte[] v1 = text.toString().getBytes(StandardCharsets.UTF_8);\n        byte[] v2 = (\"EDIT \" + text).getBytes(StandardCharsets.UTF_8);   // a change at the very start\n\n        Set<String> store = new HashSet<>();\n        int uploaded1 = 0;\n        for (byte[] c : chunk(v1)) if (store.add(sha(c))) uploaded1++;\n        int uploaded2 = 0, total2 = 0;\n        for (byte[] c : chunk(v2)) { total2++; if (store.add(sha(c))) uploaded2++; }\n        System.out.println(\"version 1: \" + chunk(v1).size() + \" chunks, all new: \" + uploaded1);\n        System.out.println(\"version 2 after inserting text at the start: \" + total2 + \" chunks, uploaded only \" + uploaded2);\n        System.out.println(\"saved by dedupe: \" + (uploaded2 < total2 / 2 ? \"most of the file\" : \"little\"));\n    }\n}"
      }
    ]
  },
  "sdd-collab-editing": {
    "architecture": [
      {
        "name": "Collaboration server (one per open document)",
        "role": "Receives operations, transforms each against those accepted since the client's base version, appends it to the log and broadcasts it, giving one total order.",
        "scale": "Most documents have 1 to 5 editors and under 100 at most, so one server per active document is enough. Route by document id with consistent hashing.",
        "failure": "If it crashes, another server loads the latest snapshot plus the log tail and clients resync from their last acknowledged version."
      },
      {
        "name": "Operation log",
        "role": "Durable, ordered log of every operation for each document, written before the acknowledgement. It is the source of truth.",
        "scale": "An active document can produce millions of operations, so snapshot and compact, and archive old logs to cheap storage.",
        "failure": "Because writes are durable before the ack, no acknowledged edit is lost. Resent operations are ignored by client-side id."
      },
      {
        "name": "Snapshot store",
        "role": "A snapshot every few hundred operations so loading needs only the latest snapshot plus a short tail.",
        "scale": "10 million concurrently open documents at a few operations a second is tens of millions of operations a second across the fleet, spread by document id.",
        "failure": "A missing snapshot only makes a load slower, since the log can be replayed from an older one."
      },
      {
        "name": "Client engine",
        "role": "Applies local edits at once, keeps one operation in flight plus a buffer, and transforms remote operations against them (or uses a CRDT such as Yjs).",
        "scale": "The one-in-flight rule keeps the number of transformation cases small. Presence cursors are throttled to a few updates a second and never stored.",
        "failure": "A bug can make replicas diverge silently, so clients send a hash at a known version and reload from the server on a mismatch."
      },
      {
        "name": "Presence and viewer fan-out",
        "role": "A lightweight channel for cursors, selections and read-only viewers, kept apart from the editing path.",
        "scale": "A document with 10,000 viewers and a few editors uses relay servers so the editing server talks only to editors.",
        "failure": "If it fails, editing continues without cursors. Revoked collaborators are disconnected at once and permissions are re-checked on reconnect."
      }
    ],
    "criteria": [
      {
        "area": "Core problem",
        "strong": "Shows with an example why applying operations as they arrive makes replicas diverge (bigs cat against big cats), and requires convergence, instant local typing and no lost edits.",
        "weak": "Locks the document or applies edits in arrival order without seeing that positions differ."
      },
      {
        "area": "OT or CRDT",
        "strong": "Explains transformation of positions against concurrent operations, the tie-break for same-position inserts and the CRDT alternative with its tombstone cost.",
        "weak": "Names OT or CRDT but cannot show how two concurrent inserts are reconciled."
      },
      {
        "area": "Server and client protocol",
        "strong": "Orders operations through one server per document, with one operation in flight and a buffer on the client and idempotent resends.",
        "weak": "Broadcasts raw operations peer to peer with no ordering and no acknowledgement."
      },
      {
        "area": "Storage and scale",
        "strong": "Uses an operation log plus snapshots, routes by document id, handles offline edits and per-user undo as new inverse operations.",
        "weak": "Stores only the latest text, so history, undo and recovery after a crash are impossible."
      },
      {
        "area": "Correctness and failure",
        "strong": "Detects divergence with hashes, fuzz tests concurrent operations, and bounds operation size and rate.",
        "weak": "Trusts the algorithm is correct and has no way to notice or repair divergent replicas."
      }
    ],
    "diagrams": [
      {
        "title": "Components",
        "source": "flowchart LR\n  C1[Client 1: editor and local copy] <--> WS[Collaboration server: one per document]\n  C2[Client 2] <--> WS\n  C3[Client 3] <--> WS\n  WS --> OL[(Operation log per document)]\n  WS --> SN[(Snapshots every N operations)]\n  WS --> PR[Presence: cursors and selections]",
        "caption": "Each editing session has one server that orders operations. Clients apply their own edits at once and reconcile with the server."
      },
      {
        "title": "Two users edit at once",
        "source": "sequenceDiagram\n  participant A as User A\n  participant S as Server\n  participant B as User B\n  Note over A,B: document is cat, both have version 0\n  A->>A: insert big at 0 locally\n  B->>B: insert s at 3 locally\n  A->>S: op insert big at 0, based on version 0\n  S-->>A: accepted as version 1\n  B->>S: op insert s at 3, based on version 0\n  S->>S: transform against version 1, position 3 becomes 7\n  S-->>B: accepted as version 2, plus version 1 to apply\n  S-->>A: version 2 insert s at 7",
        "caption": "Both apply their own edit instantly. The server orders them and transforms the later one so that everyone ends with the same text."
      },
      {
        "title": "Client state",
        "source": "stateDiagram-v2\n  [*] --> Synchronized\n  Synchronized --> AwaitingAck: user edits, send the operation\n  AwaitingAck --> AwaitingAckWithBuffer: user edits again, buffer it\n  AwaitingAck --> Synchronized: server acknowledges\n  AwaitingAckWithBuffer --> AwaitingAck: server acknowledges, send the buffer\n  AwaitingAck --> AwaitingAck: remote operation arrives, transform it against ours\n  AwaitingAckWithBuffer --> AwaitingAckWithBuffer: remote operation arrives, transform it",
        "caption": "A client may have one operation in flight and others waiting, so it can always type without waiting for the network."
      }
    ],
    "sections": [
      {
        "title": "Requirements and the core problem",
        "body": "Collaborative editing (Google Docs style) lets several people edit one document at the same time and see each other's changes within a fraction of a second. Requirements: every user's own typing must feel instant (no waiting for a server round trip), all users must end with **exactly the same document**, no one's edit may be lost, and the system must work through short disconnections.\n\nThe difficulty is that edits are made against different versions of the document. User A inserts \"big \" at the start while user B, who has not yet seen that, appends \"s\" at the end of \"cat\". The positions refer to different texts. The demo shows what goes wrong if you just apply operations as they arrive: user 1 ends with `bigs cat` and user 2 with `big cats`. The two replicas have diverged, and nothing will ever repair it.\n\nTwo families of algorithms solve this. **Operational transformation (OT)** adjusts incoming operations to account for concurrent ones, using a central server to order them. **CRDTs** (conflict-free replicated data types) give every character a unique, ordered identity so that operations commute and can be applied in any order, without a central server. OT is what Google Docs uses; CRDTs power systems such as Figma-style and local-first apps and libraries like Yjs and Automerge.\n\nScale: a document typically has fewer than 100 simultaneous editors, and most have 1 to 5, so a single server per active document is enough. The load is many small documents, not one huge one: 10 million concurrently open documents at a few operations a second is tens of millions of operations a second across a fleet, spread by document id."
      },
      {
        "title": "Operational transformation, concretely",
        "body": "An **operation** here is an insert (position, text) or a delete (position, length). **Transformation** takes an operation that was made against an older state and rewrites it to apply after a concurrent operation that has already been applied. If A inserted 4 characters at position 0, then B's insert at position 3 (made without knowing about A) must move to position 7, because 4 new characters now sit before it.\n\nThe demo's `transform` function does this for inserts: if the already-applied insert is at an earlier position, shift by its length. For two inserts at the same position, a tie-break rule (the lower user id goes first) keeps both users deciding the same way. With transformation, user 1 and user 2 both end with `big cats`, and the program prints `converged: true`. For same-position inserts of X and Y into `ab`, both replicas end with `aXYb`.\n\nThe server design keeps this tractable. One server per document assigns a total order: it receives operations, transforms each against the operations accepted since the client's base version, appends the result to the log, and broadcasts it. A client needs to handle only the situation in the state diagram: at most one operation sent and unacknowledged, plus a buffer of local edits made meanwhile. When a remote operation arrives, the client transforms it against its outstanding and buffered operations before applying it locally, and transforms its own operations the other way, so the two sides stay consistent. This one-in-flight rule is what keeps the number of cases small.\n\nDeletes and overlapping ranges, formatting (bold over a range that changes), and structured content (tables, lists) add transformation cases. Correctness proofs are hard, and OT implementations are known for subtle bugs, which is a reason many new systems prefer CRDTs: Yjs gives each character a unique id and a position defined relative to its neighbours, so concurrent inserts merge deterministically with no transform step. The cost is metadata: each character carries an id, and tombstones for deleted characters accumulate until compacted.\n\nPresence (other users' cursors and selections) is a separate lightweight channel: positions are sent as operations-aware offsets and transformed like text, but are never stored, and updates are throttled to a few per second."
      },
      {
        "title": "Storage, history and scale",
        "body": "Store each document as an **operation log** plus periodic **snapshots**. The log gives full history, undo, and \"restore this version\" (replay up to a point). A snapshot every few hundred operations means loading a document needs only the latest snapshot plus a short tail of operations, not the whole history. Snapshots and old logs can be compacted: merge many small operations into larger ones for old history.\n\nRouting: a document is edited through a single collaboration server at a time, so route by document id with consistent hashing, and keep a small registry of which server owns which open document. If the owner dies, another server loads the latest snapshot and log tail from storage and clients reconnect and resync from their last acknowledged version. Because the log is the source of truth and writes to it are durable before acknowledgement, no acknowledged edit is lost.\n\nOffline editing: while disconnected, the client keeps applying edits locally and queues them. On reconnect it sends them based on its last known version, and the server transforms them like any concurrent edits. Long offline periods create large transformations, so some systems cap the offline window or merge by CRDT.\n\n**Undo** is per user: undoing my last change must not undo yours, so undo generates an inverse operation, transformed against everything since, and appended as a new operation.\n\nPermissions are checked on every operation (view, comment, edit), and operations are validated (a position beyond the document length is rejected). Rate limits protect the server from a client sending thousands of operations a second."
      },
      {
        "title": "Failure modes",
        "body": "**The collaboration server crashes.** Clients detect the closed connection and retry. A new server loads the document from the latest snapshot plus the log. Operations that a client had sent but not seen acknowledged are re-sent with their client-side ids, and the server ignores any it already logged. Every acknowledged edit was written to the log first, so nothing acknowledged is lost.\n\n**Clients diverge because of a bug.** This is the worst failure in an OT or CRDT system: replicas silently differ. Defences: clients periodically send a hash of their document at a known version and the server compares it to its own; on a mismatch the client discards its state and reloads from the server. Fuzz testing with random concurrent operations and checking convergence finds most transformation bugs before release.\n\n**A very hot document.** A document with 10,000 viewers and a few editors: send viewers a read-only stream, possibly through a fan-out tier of relay servers, so the editing server only talks to editors.\n\n**Network partition between a client and the server.** The client keeps working locally and shows \"offline\". On return it resynchronises. If the server rejects stale operations beyond the retained history, the client rebases against a fresh copy and the user is shown what changed.\n\n**Large paste or file.** Break it into bounded operations and limit operation size so one client cannot block the server or flood others.\n\n**Log growth.** An active document produces millions of operations. Snapshot and compact, and archive old logs to cheap storage; keep enough history for undo and restore.\n\n**Security.** Documents may contain sensitive data, so all traffic is encrypted in transit, permissions are re-checked on reconnect, and a revoked collaborator is disconnected at once."
      }
    ],
    "code": [
      {
        "name": "OtDemo.java",
        "code": "public class OtDemo {\n    /** An insert operation: put text at a position in the document. */\n    record Insert(int pos, String text, int site) {}\n\n    static String apply(String doc, Insert op) {\n        return doc.substring(0, op.pos()) + op.text() + doc.substring(op.pos());\n    }\n\n    /** Transform op against another op that was applied first, so both users end with the same document. */\n    static Insert transform(Insert op, Insert applied) {\n        boolean shift = applied.pos() < op.pos() || (applied.pos() == op.pos() && applied.site() < op.site());\n        return shift ? new Insert(op.pos() + applied.text().length(), op.text(), op.site()) : op;\n    }\n\n    public static void main(String[] args) {\n        String doc = \"cat\";\n        Insert a = new Insert(0, \"big \", 1);   // user 1 types at the start\n        Insert b = new Insert(3, \"s\", 2);      // user 2 types at the end, at the same moment\n\n        String naive1 = apply(apply(doc, a), b);                 // user 1: own op, then b untransformed\n        String naive2 = apply(apply(doc, b), a);                 // user 2: own op, then a untransformed\n        System.out.println(\"without transform: user1 sees [\" + naive1 + \"], user2 sees [\" + naive2 + \"]\");\n\n        String ot1 = apply(apply(doc, a), transform(b, a));\n        String ot2 = apply(apply(doc, b), transform(a, b));\n        System.out.println(\"with transform: user1 sees [\" + ot1 + \"], user2 sees [\" + ot2 + \"]\");\n        System.out.println(\"converged: \" + ot1.equals(ot2));\n\n        Insert c = new Insert(1, \"X\", 1), d = new Insert(1, \"Y\", 2);   // both insert at the same position\n        String t1 = apply(apply(\"ab\", c), transform(d, c));\n        String t2 = apply(apply(\"ab\", d), transform(c, d));\n        System.out.println(\"same position: [\" + t1 + \"] and [\" + t2 + \"] converged: \" + t1.equals(t2));\n    }\n}"
      }
    ]
  }
};
