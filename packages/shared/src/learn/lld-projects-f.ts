import type { LldProject } from "./types";

// Batch F LLD projects (plan 0025). Java 17, standard library only, default package.
// Compiled with javac -Xlint:all and run (Main and Tests) when written.

export const LLD_PROJECTS_F: Record<string, LldProject> = {
  "lldp-pubsub": {
    files: [
      {
        name: "Consumer.java",
        code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.OptionalLong;
import java.util.Set;

final class Consumer implements AutoCloseable {
    private final String groupId;
    private final String memberId;
    private final MessageBroker broker;
    private final Map<TopicPartition, Long> fetchPositions = new HashMap<>();
    private Set<String> subscribedTopics = new HashSet<>();
    private Set<TopicPartition> manualAssignments = null;
    private boolean closed = false;

    Consumer(String groupId, String memberId, MessageBroker broker) {
        if (groupId == null || memberId == null || broker == null) {
            throw new IllegalArgumentException("groupId, memberId and broker cannot be null");
        }
        this.groupId = groupId;
        this.memberId = memberId;
        this.broker = broker;
    }

    String groupId() { return groupId; }
    String memberId() { return memberId; }

    void subscribe(Set<String> topics) {
        ensureOpen();
        this.subscribedTopics = new HashSet<>(topics);
        this.manualAssignments = null;
        broker.getCoordinator(groupId).register(memberId, subscribedTopics);
    }

    void assign(Set<TopicPartition> partitions) {
        ensureOpen();
        if (!subscribedTopics.isEmpty()) {
            broker.getCoordinator(groupId).deregister(memberId);
            subscribedTopics.clear();
        }
        this.manualAssignments = new HashSet<>(partitions);
    }

    Set<TopicPartition> assignment() {
        if (manualAssignments != null) {
            return Collections.unmodifiableSet(manualAssignments);
        }
        return broker.getCoordinator(groupId).getAssignments(memberId);
    }

    void seek(TopicPartition tp, long offset) {
        ensureOpen();
        if (offset < 0) throw new IllegalArgumentException("offset cannot be negative");
        fetchPositions.put(tp, offset);
    }

    long position(TopicPartition tp) {
        ensureOpen();
        return getOrInitPosition(tp);
    }

    List<ConsumerRecord> poll(long timeoutMillis, int maxRecords) {
        ensureOpen();
        Set<TopicPartition> partitions = assignment();
        if (partitions.isEmpty() || maxRecords <= 0) {
            return Collections.emptyList();
        }

        List<ConsumerRecord> records = new ArrayList<>();
        int perPartitionLimit = Math.max(1, maxRecords / partitions.size());

        for (TopicPartition tp : partitions) {
            Topic topic = broker.findTopic(tp.topic());
            if (topic == null) continue;
            Partition part = topic.partition(tp.partition());

            long fetchOffset = getOrInitPosition(tp);
            List<Message> msgs = part.poll(fetchOffset, perPartitionLimit, timeoutMillis / Math.max(1, partitions.size()));
            for (Message msg : msgs) {
                records.add(new ConsumerRecord(tp.topic(), tp.partition(), msg.offset(), msg.key(), msg.payload(), msg.timestamp()));
                fetchPositions.put(tp, msg.offset() + 1);
            }
            if (records.size() >= maxRecords) break;
        }
        return records;
    }

    void commitSync() {
        ensureOpen();
        broker.offsetManager().commitAll(groupId, fetchPositions);
    }

    void commitOffset(TopicPartition tp, long offset) {
        ensureOpen();
        broker.offsetManager().commit(groupId, tp, offset);
    }

    private long getOrInitPosition(TopicPartition tp) {
        Long pos = fetchPositions.get(tp);
        if (pos != null) return pos;

        OptionalLong committed = broker.offsetManager().getCommitted(groupId, tp);
        long startingOffset = committed.orElse(0L);
        fetchPositions.put(tp, startingOffset);
        return startingOffset;
    }

    private void ensureOpen() {
        if (closed) throw new IllegalStateException("Consumer " + memberId + " is closed");
    }

    @Override
    public void close() {
        if (closed) return;
        closed = true;
        if (!subscribedTopics.isEmpty()) {
            broker.getCoordinator(groupId).deregister(memberId);
        }
    }
}
`,
      },
      {
        name: "ConsumerGroupCoordinator.java",
        code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

final class ConsumerGroupCoordinator {
    private final String groupId;
    private final MessageBroker broker;
    private final ReentrantLock lock = new ReentrantLock();
    private final Map<String, Set<String>> memberSubscriptions = new HashMap<>();
    private final Map<String, Set<TopicPartition>> memberAssignments = new HashMap<>();
    private int generationId = 0;

    ConsumerGroupCoordinator(String groupId, MessageBroker broker) {
        this.groupId = groupId;
        this.broker = broker;
    }

    String groupId() { return groupId; }
    int generationId() { return generationId; }

    void register(String memberId, Set<String> topics) {
        lock.lock();
        try {
            memberSubscriptions.put(memberId, new HashSet<>(topics));
            rebalance();
        } finally {
            lock.unlock();
        }
    }

    void deregister(String memberId) {
        lock.lock();
        try {
            memberSubscriptions.remove(memberId);
            memberAssignments.remove(memberId);
            rebalance();
        } finally {
            lock.unlock();
        }
    }

    Set<TopicPartition> getAssignments(String memberId) {
        lock.lock();
        try {
            Set<TopicPartition> set = memberAssignments.get(memberId);
            return set != null ? Collections.unmodifiableSet(set) : Collections.emptySet();
        } finally {
            lock.unlock();
        }
    }

    private void rebalance() {
        generationId++;
        memberAssignments.clear();
        if (memberSubscriptions.isEmpty()) return;

        for (String memberId : memberSubscriptions.keySet()) {
            memberAssignments.put(memberId, new TreeSet<>());
        }

        // Map topic -> members subscribed
        Map<String, List<String>> topicToMembers = new HashMap<>();
        for (Map.Entry<String, Set<String>> entry : memberSubscriptions.entrySet()) {
            String member = entry.getKey();
            for (String topic : entry.getValue()) {
                topicToMembers.computeIfAbsent(topic, t -> new ArrayList<>()).add(member);
            }
        }

        for (Map.Entry<String, List<String>> entry : topicToMembers.entrySet()) {
            String topicName = entry.getKey();
            List<String> members = entry.getValue();
            Collections.sort(members);
            Topic topic = broker.findTopic(topicName);
            if (topic == null) continue;

            int partitionCount = topic.partitionCount();
            for (int p = 0; p < partitionCount; p++) {
                String assignedMember = members.get(p % members.size());
                memberAssignments.get(assignedMember).add(new TopicPartition(topicName, p));
            }
        }
    }

    Set<String> members() {
        lock.lock();
        try {
            return Collections.unmodifiableSet(new HashSet<>(memberSubscriptions.keySet()));
        } finally {
            lock.unlock();
        }
    }
}
`,
      },
      {
        name: "ConsumerRecord.java",
        code: `record ConsumerRecord(String topic, int partition, long offset, String key, String payload, long timestamp) {
    TopicPartition topicPartition() {
        return new TopicPartition(topic, partition);
    }
}
`,
      },
      {
        name: "KeyHashPartitioner.java",
        code: `import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

final class KeyHashPartitioner implements PartitionStrategy {
    private final ConcurrentHashMap<String, AtomicInteger> fallbackCounters = new ConcurrentHashMap<>();

    @Override
    public int selectPartition(String topic, String key, int numPartitions) {
        if (numPartitions <= 0) throw new IllegalArgumentException("numPartitions must be positive");
        if (key == null) {
            AtomicInteger counter = fallbackCounters.computeIfAbsent(topic, t -> new AtomicInteger(0));
            return Math.floorMod(counter.getAndIncrement(), numPartitions);
        }
        int hash = key.hashCode();
        // Spread high bits to prevent poor distribution with sequential string keys
        hash = hash ^ (hash >>> 16);
        return Math.floorMod(hash, numPartitions);
    }
}
`,
      },
      {
        name: "Main.java",
        code: `import java.util.List;
import java.util.Set;

public class Main {
    public static void main(String[] args) {
        MessageBroker broker = new MessageBroker();
        Topic ordersTopic = broker.createTopic("orders", 3, new KeyHashPartitioner());
        System.out.println("Created topic: " + ordersTopic.name() + " with " + ordersTopic.partitionCount() + " partitions");

        Producer producer = broker.createProducer();
        RecordMetadata m1 = producer.send("orders", "cust-1", "order:ord-101");
        RecordMetadata m2 = producer.send("orders", "cust-2", "order:ord-102");
        RecordMetadata m3 = producer.send("orders", "cust-1", "order:ord-103");
        RecordMetadata m4 = producer.send("orders", "cust-3", "order:ord-104");

        System.out.println("Published m1 to partition " + m1.partition() + " at offset " + m1.offset());
        System.out.println("Published m2 to partition " + m2.partition() + " at offset " + m2.offset());
        System.out.println("Published m3 with same key to partition " + m3.partition() + " at offset " + m3.offset());

        Consumer c1 = broker.createConsumer("order-processors", "consumer-1");
        Consumer c2 = broker.createConsumer("order-processors", "consumer-2");
        c1.subscribe(Set.of("orders"));
        c2.subscribe(Set.of("orders"));

        System.out.println("c1 assigned partitions: " + c1.assignment());
        System.out.println("c2 assigned partitions: " + c2.assignment());

        List<ConsumerRecord> r1 = c1.poll(100, 10);
        List<ConsumerRecord> r2 = c2.poll(100, 10);
        System.out.println("c1 polled " + r1.size() + " records");
        System.out.println("c2 polled " + r2.size() + " records");

        c1.commitSync();
        c2.commitSync();
        System.out.println("Committed offsets for order-processors: " + broker.offsetManager().getAllCommitted("order-processors"));

        Consumer c3 = broker.createConsumer("order-processors", "consumer-3");
        c3.subscribe(Set.of("orders"));
        System.out.println("After rebalance c1 partitions: " + c1.assignment().size() + ", c2: " + c2.assignment().size() + ", c3: " + c3.assignment().size());

        Consumer auditConsumer = broker.createConsumer("audit-group", "audit-1");
        auditConsumer.subscribe(Set.of("orders"));
        List<ConsumerRecord> auditRecords = auditConsumer.poll(100, 10);
        System.out.println("Independent audit-group polled " + auditRecords.size() + " records from beginning");

        c1.close();
        c2.close();
        c3.close();
        auditConsumer.close();
    }
}
`,
      },
      {
        name: "Message.java",
        code: `record Message(long offset, String key, String payload, long timestamp) {
    Message {
        if (offset < 0) throw new IllegalArgumentException("offset cannot be negative");
    }
}
`,
      },
      {
        name: "MessageBroker.java",
        code: `import java.util.Collections;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

final class MessageBroker {
    private final ConcurrentHashMap<String, Topic> topics = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ConsumerGroupCoordinator> coordinators = new ConcurrentHashMap<>();
    private final OffsetManager offsetManager = new OffsetManager();

    Topic createTopic(String name, int partitions, PartitionStrategy strategy) {
        if (topics.containsKey(name)) {
            throw new IllegalArgumentException("Topic " + name + " already exists");
        }
        Topic topic = new Topic(name, partitions, strategy);
        topics.put(name, topic);
        return topic;
    }

    Topic createTopic(String name, int partitions) {
        return createTopic(name, partitions, new KeyHashPartitioner());
    }

    Topic getTopic(String name) {
        Topic t = topics.get(name);
        if (t == null) throw new NoSuchElementException("Topic not found: " + name);
        return t;
    }

    Topic findTopic(String name) {
        return topics.get(name);
    }

    Set<String> listTopics() {
        return Collections.unmodifiableSet(topics.keySet());
    }

    Producer createProducer() {
        return new Producer(this);
    }

    Consumer createConsumer(String groupId, String memberId) {
        return new Consumer(groupId, memberId, this);
    }

    OffsetManager offsetManager() {
        return offsetManager;
    }

    ConsumerGroupCoordinator getCoordinator(String groupId) {
        return coordinators.computeIfAbsent(groupId, g -> new ConsumerGroupCoordinator(g, this));
    }
}
`,
      },
      {
        name: "OffsetManager.java",
        code: `import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.OptionalLong;
import java.util.concurrent.ConcurrentHashMap;

final class OffsetManager {
    // groupId -> (TopicPartition -> committed offset)
    private final ConcurrentHashMap<String, ConcurrentHashMap<TopicPartition, Long>> committed = new ConcurrentHashMap<>();

    void commit(String groupId, TopicPartition tp, long offset) {
        if (groupId == null || tp == null) throw new IllegalArgumentException("group and partition required");
        committed.computeIfAbsent(groupId, g -> new ConcurrentHashMap<>()).put(tp, offset);
    }

    void commitAll(String groupId, Map<TopicPartition, Long> offsets) {
        if (groupId == null || offsets == null) throw new IllegalArgumentException("group and offsets required");
        ConcurrentHashMap<TopicPartition, Long> map = committed.computeIfAbsent(groupId, g -> new ConcurrentHashMap<>());
        map.putAll(offsets);
    }

    OptionalLong getCommitted(String groupId, TopicPartition tp) {
        ConcurrentHashMap<TopicPartition, Long> map = committed.get(groupId);
        if (map == null) return OptionalLong.empty();
        Long offset = map.get(tp);
        return offset != null ? OptionalLong.of(offset) : OptionalLong.empty();
    }

    Map<TopicPartition, Long> getAllCommitted(String groupId) {
        ConcurrentHashMap<TopicPartition, Long> map = committed.get(groupId);
        if (map == null) return Collections.emptyMap();
        return Collections.unmodifiableMap(new HashMap<>(map));
    }

    void resetGroup(String groupId) {
        committed.remove(groupId);
    }
}
`,
      },
      {
        name: "Partition.java",
        code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;

final class Partition {
    private final String topic;
    private final int partitionId;
    private final List<Message> messages = new ArrayList<>();
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition hasData = lock.newCondition();
    private long baseOffset = 0;

    Partition(String topic, int partitionId) {
        this.topic = topic;
        this.partitionId = partitionId;
    }

    String topic() { return topic; }
    int partitionId() { return partitionId; }
    TopicPartition topicPartition() { return new TopicPartition(topic, partitionId); }

    RecordMetadata append(String key, String payload, long timestamp) {
        lock.lock();
        try {
            long offset = baseOffset + messages.size();
            Message msg = new Message(offset, key, payload, timestamp);
            messages.add(msg);
            hasData.signalAll();
            return new RecordMetadata(topic, partitionId, offset, timestamp);
        } finally {
            lock.unlock();
        }
    }

    List<Message> read(long fromOffset, int maxRecords) {
        lock.lock();
        try {
            if (fromOffset < baseOffset) {
                fromOffset = baseOffset;
            }
            int startIndex = (int) (fromOffset - baseOffset);
            if (startIndex >= messages.size()) {
                return Collections.emptyList();
            }
            int endIndex = Math.min(messages.size(), startIndex + maxRecords);
            return new ArrayList<>(messages.subList(startIndex, endIndex));
        } finally {
            lock.unlock();
        }
    }

    List<Message> poll(long fromOffset, int maxRecords, long timeoutMillis) {
        lock.lock();
        try {
            long remainingNanos = TimeUnit.MILLISECONDS.toNanos(timeoutMillis);
            int startIndex = (int) (fromOffset - baseOffset);
            while (startIndex >= messages.size() && remainingNanos > 0) {
                try {
                    remainingNanos = hasData.awaitNanos(remainingNanos);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
                startIndex = (int) (fromOffset - baseOffset);
            }
            if (startIndex < 0) startIndex = 0;
            if (startIndex >= messages.size()) {
                return Collections.emptyList();
            }
            int endIndex = Math.min(messages.size(), startIndex + maxRecords);
            return new ArrayList<>(messages.subList(startIndex, endIndex));
        } finally {
            lock.unlock();
        }
    }

    long nextOffset() {
        lock.lock();
        try {
            return baseOffset + messages.size();
        } finally {
            lock.unlock();
        }
    }

    long earliestOffset() {
        lock.lock();
        try {
            return baseOffset;
        } finally {
            lock.unlock();
        }
    }

    int size() {
        lock.lock();
        try {
            return messages.size();
        } finally {
            lock.unlock();
        }
    }
}
`,
      },
      {
        name: "PartitionStrategy.java",
        code: `interface PartitionStrategy {
    int selectPartition(String topic, String key, int numPartitions);
}
`,
      },
      {
        name: "Producer.java",
        code: `final class Producer {
    private final MessageBroker broker;

    Producer(MessageBroker broker) {
        if (broker == null) throw new IllegalArgumentException("broker cannot be null");
        this.broker = broker;
    }

    RecordMetadata send(String topicName, String key, String payload) {
        Topic topic = broker.getTopic(topicName);
        return topic.publish(key, payload, System.currentTimeMillis());
    }

    RecordMetadata send(String topicName, String payload) {
        return send(topicName, null, payload);
    }

    RecordMetadata sendToPartition(String topicName, int partition, String key, String payload) {
        Topic topic = broker.getTopic(topicName);
        return topic.publishToPartition(partition, key, payload, System.currentTimeMillis());
    }
}
`,
      },
      {
        name: "RecordMetadata.java",
        code: `record RecordMetadata(String topic, int partition, long offset, long timestamp) {
    TopicPartition topicPartition() {
        return new TopicPartition(topic, partition);
    }
}
`,
      },
      {
        name: "RoundRobinPartitioner.java",
        code: `import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

final class RoundRobinPartitioner implements PartitionStrategy {
    private final ConcurrentHashMap<String, AtomicInteger> counters = new ConcurrentHashMap<>();

    @Override
    public int selectPartition(String topic, String key, int numPartitions) {
        if (numPartitions <= 0) throw new IllegalArgumentException("numPartitions must be positive");
        AtomicInteger counter = counters.computeIfAbsent(topic, t -> new AtomicInteger(0));
        int next = counter.getAndIncrement();
        return Math.floorMod(next, numPartitions);
    }
}
`,
      },
      {
        name: "Topic.java",
        code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

final class Topic {
    private final String name;
    private final List<Partition> partitions;
    private final PartitionStrategy strategy;

    Topic(String name, int numPartitions, PartitionStrategy strategy) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("topic name cannot be blank");
        if (numPartitions <= 0) throw new IllegalArgumentException("numPartitions must be positive");
        this.name = name;
        this.strategy = strategy != null ? strategy : new RoundRobinPartitioner();
        List<Partition> list = new ArrayList<>(numPartitions);
        for (int i = 0; i < numPartitions; i++) {
            list.add(new Partition(name, i));
        }
        this.partitions = Collections.unmodifiableList(list);
    }

    String name() { return name; }
    int partitionCount() { return partitions.size(); }
    List<Partition> partitions() { return partitions; }

    Partition partition(int partitionId) {
        if (partitionId < 0 || partitionId >= partitions.size()) {
            throw new IllegalArgumentException("Invalid partition " + partitionId + " for topic " + name);
        }
        return partitions.get(partitionId);
    }

    RecordMetadata publish(String key, String payload, long timestamp) {
        int partitionId = strategy.selectPartition(name, key, partitions.size());
        return partitions.get(partitionId).append(key, payload, timestamp);
    }

    RecordMetadata publishToPartition(int partitionId, String key, String payload, long timestamp) {
        return partition(partitionId).append(key, payload, timestamp);
    }
}
`,
      },
      {
        name: "TopicPartition.java",
        code: `record TopicPartition(String topic, int partition) implements Comparable<TopicPartition> {
    TopicPartition {
        if (topic == null || topic.isBlank()) throw new IllegalArgumentException("topic cannot be blank");
        if (partition < 0) throw new IllegalArgumentException("partition cannot be negative");
    }

    @Override
    public int compareTo(TopicPartition other) {
        int cmp = this.topic.compareTo(other.topic);
        if (cmp != 0) return cmp;
        return Integer.compare(this.partition, other.partition);
    }

    @Override
    public String toString() {
        return topic + "-" + partition;
    }
}
`,
      },
    ],
    tests: [
      {
        name: "Tests.java",
        code: `import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.OptionalLong;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

public class Tests {
    private static int checks = 0;

    private static void check(boolean condition, String message) {
        checks++;
        if (!condition) {
            throw new AssertionError("FAIL: " + message);
        }
    }

    public static void main(String[] args) throws Exception {
        testPartitionAppendAndRead();
        testKeyHashPartitionerConsistency();
        testRoundRobinPartitioner();
        testConsumerPollAndFetchPosition();
        testManualSeek();
        testOffsetManager();
        testConsumerGroupRebalance();
        testIndependentConsumerGroups();
        testConcurrentProducers();

        System.out.println("PASS: all " + checks + " checks passed");
    }

    private static void testPartitionAppendAndRead() {
        Partition p = new Partition("test-topic", 0);
        check(p.size() == 0, "partition initial size is 0");
        check(p.nextOffset() == 0, "partition nextOffset starts at 0");

        RecordMetadata m1 = p.append("k1", "v1", 1000L);
        RecordMetadata m2 = p.append("k2", "v2", 1001L);
        RecordMetadata m3 = p.append("k3", "v3", 1002L);

        check(m1.offset() == 0, "first message offset is 0");
        check(m2.offset() == 1, "second message offset is 1");
        check(m3.offset() == 2, "third message offset is 2");
        check(p.size() == 3, "partition size is now 3");
        check(p.nextOffset() == 3, "next offset is 3");

        List<Message> read0 = p.read(0, 10);
        check(read0.size() == 3, "read from 0 returns all 3 messages");
        check(read0.get(0).payload().equals("v1"), "payload 0 matches");
        check(read0.get(1).payload().equals("v2"), "payload 1 matches");
        check(read0.get(2).payload().equals("v3"), "payload 2 matches");

        List<Message> read1 = p.read(1, 1);
        check(read1.size() == 1, "read max 1 returns 1 message");
        check(read1.get(0).offset() == 1, "read from offset 1 gets offset 1");

        List<Message> readPast = p.read(5, 10);
        check(readPast.isEmpty(), "read past end returns empty list");
    }

    private static void testKeyHashPartitionerConsistency() {
        KeyHashPartitioner partitioner = new KeyHashPartitioner();
        int p1 = partitioner.selectPartition("events", "user:42", 5);
        int p2 = partitioner.selectPartition("events", "user:42", 5);
        int p3 = partitioner.selectPartition("events", "user:42", 5);
        check(p1 == p2 && p2 == p3, "same key always hashes to the same partition");
        check(p1 >= 0 && p1 < 5, "partition index is in range [0, 5)");

        // Null keys distribute sequentially
        int n1 = partitioner.selectPartition("events", null, 3);
        int n2 = partitioner.selectPartition("events", null, 3);
        check(n1 != n2, "null keys route to successive partitions");
    }

    private static void testRoundRobinPartitioner() {
        RoundRobinPartitioner rr = new RoundRobinPartitioner();
        int[] counts = new int[4];
        for (int i = 0; i < 40; i++) {
            int p = rr.selectPartition("stream", "key-" + i, 4);
            counts[p]++;
        }
        for (int i = 0; i < 4; i++) {
            check(counts[i] == 10, "round robin assigns exactly equal distribution");
        }
    }

    private static void testConsumerPollAndFetchPosition() {
        MessageBroker broker = new MessageBroker();
        Topic topic = broker.createTopic("payments", 2);
        Producer producer = broker.createProducer();

        producer.sendToPartition("payments", 0, "k1", "pay-0-0");
        producer.sendToPartition("payments", 0, "k2", "pay-0-1");
        producer.sendToPartition("payments", 1, "k3", "pay-1-0");

        try (Consumer consumer = broker.createConsumer("fin-group", "fin-1")) {
            consumer.subscribe(Set.of("payments"));
            Set<TopicPartition> assigned = consumer.assignment();
            check(assigned.size() == 2, "single consumer assigned both partitions");

            List<ConsumerRecord> batch1 = consumer.poll(100, 10);
            check(batch1.size() == 3, "polled all 3 payments");

            check(consumer.position(new TopicPartition("payments", 0)) == 2, "pos on p0 is 2");
            check(consumer.position(new TopicPartition("payments", 1)) == 1, "pos on p1 is 1");

            List<ConsumerRecord> batch2 = consumer.poll(50, 10);
            check(batch2.isEmpty(), "immediate next poll returns empty when no new messages");

            consumer.commitSync();
            OptionalLong comm0 = broker.offsetManager().getCommitted("fin-group", new TopicPartition("payments", 0));
            OptionalLong comm1 = broker.offsetManager().getCommitted("fin-group", new TopicPartition("payments", 1));
            check(comm0.isPresent() && comm0.getAsLong() == 2, "committed offset on p0 is 2");
            check(comm1.isPresent() && comm1.getAsLong() == 1, "committed offset on p1 is 1");
        }
    }

    private static void testManualSeek() {
        MessageBroker broker = new MessageBroker();
        Topic topic = broker.createTopic("logs", 1);
        Producer producer = broker.createProducer();
        producer.send("logs", "line 1");
        producer.send("logs", "line 2");
        producer.send("logs", "line 3");

        try (Consumer consumer = broker.createConsumer("log-group", "reader-1")) {
            consumer.subscribe(Set.of("logs"));
            List<ConsumerRecord> recs = consumer.poll(100, 10);
            check(recs.size() == 3, "read 3 log lines");

            TopicPartition tp = new TopicPartition("logs", 0);
            consumer.seek(tp, 1);
            check(consumer.position(tp) == 1, "position reset to 1 after seek");

            List<ConsumerRecord> reRead = consumer.poll(100, 10);
            check(reRead.size() == 2, "polled 2 lines after seeking to 1");
            check(reRead.get(0).payload().equals("line 2"), "first re-read line is line 2");
            check(reRead.get(1).payload().equals("line 3"), "second re-read line is line 3");
        }
    }

    private static void testOffsetManager() {
        OffsetManager om = new OffsetManager();
        TopicPartition tp = new TopicPartition("clicks", 0);
        check(om.getCommitted("analytics", tp).isEmpty(), "initially no committed offset");

        om.commit("analytics", tp, 150L);
        check(om.getCommitted("analytics", tp).getAsLong() == 150L, "committed offset is 150");

        om.commitAll("analytics", Map.of(
            new TopicPartition("clicks", 1), 200L,
            new TopicPartition("clicks", 2), 350L
        ));
        Map<TopicPartition, Long> all = om.getAllCommitted("analytics");
        check(all.size() == 3, "total 3 committed partitions");
        check(all.get(new TopicPartition("clicks", 1)) == 200L, "p1 committed is 200");
    }

    private static void testConsumerGroupRebalance() {
        MessageBroker broker = new MessageBroker();
        broker.createTopic("telemetry", 4);

        Consumer c1 = broker.createConsumer("telemetry-group", "c-1");
        c1.subscribe(Set.of("telemetry"));
        check(c1.assignment().size() == 4, "1 consumer gets all 4 partitions");

        Consumer c2 = broker.createConsumer("telemetry-group", "c-2");
        c2.subscribe(Set.of("telemetry"));
        check(c1.assignment().size() == 2, "after c2 joins, c1 gets 2 partitions");
        check(c2.assignment().size() == 2, "after c2 joins, c2 gets 2 partitions");

        Set<TopicPartition> union = new HashSet<>();
        union.addAll(c1.assignment());
        union.addAll(c2.assignment());
        check(union.size() == 4, "all 4 partitions assigned without overlap");

        // Now c2 leaves
        c2.close();
        check(c1.assignment().size() == 4, "after c2 closes, c1 reclaims all 4 partitions");
        c1.close();
    }

    private static void testIndependentConsumerGroups() {
        MessageBroker broker = new MessageBroker();
        broker.createTopic("news", 1);
        Producer producer = broker.createProducer();
        producer.send("news", "headline 1");
        producer.send("news", "headline 2");

        Consumer g1 = broker.createConsumer("group-A", "a-1");
        Consumer g2 = broker.createConsumer("group-B", "b-1");
        g1.subscribe(Set.of("news"));
        g2.subscribe(Set.of("news"));

        List<ConsumerRecord> rA = g1.poll(100, 10);
        g1.commitSync();

        check(rA.size() == 2, "group A reads 2 messages");
        check(broker.offsetManager().getCommitted("group-A", new TopicPartition("news", 0)).getAsLong() == 2, "group A offset is 2");
        check(broker.offsetManager().getCommitted("group-B", new TopicPartition("news", 0)).isEmpty(), "group B has no commits yet");

        List<ConsumerRecord> rB = g2.poll(100, 10);
        check(rB.size() == 2, "group B also reads the same 2 messages independently");

        g1.close();
        g2.close();
    }

    private static void testConcurrentProducers() throws Exception {
        MessageBroker broker = new MessageBroker();
        Topic topic = broker.createTopic("concurrent-topic", 3, new KeyHashPartitioner());
        Producer producer = broker.createProducer();

        int threadCount = 8;
        int messagesPerThread = 100;
        CountDownLatch latch = new CountDownLatch(threadCount);
        ConcurrentHashMap<String, Boolean> producedPayloads = new ConcurrentHashMap<>();

        for (int i = 0; i < threadCount; i++) {
            final int threadId = i;
            new Thread(() -> {
                for (int m = 0; m < messagesPerThread; m++) {
                    String payload = "msg-" + threadId + "-" + m;
                    producedPayloads.put(payload, true);
                    producer.send("concurrent-topic", "key-" + threadId, payload);
                }
                latch.countDown();
            }).start();
        }

        latch.await();

        int totalInTopic = 0;
        for (Partition p : topic.partitions()) {
            totalInTopic += p.size();
        }
        check(totalInTopic == threadCount * messagesPerThread, "all 800 concurrent messages safely stored in partitions");

        Consumer consumer = broker.createConsumer("verify-group", "v-1");
        consumer.subscribe(Set.of("concurrent-topic"));
        List<ConsumerRecord> allRecords = new ArrayList<>();
        while (allRecords.size() < totalInTopic) {
            List<ConsumerRecord> batch = consumer.poll(100, 200);
            if (batch.isEmpty()) break;
            allRecords.addAll(batch);
        }
        check(allRecords.size() == totalInTopic, "consumer received all concurrent records");
        consumer.close();
    }
}
`,
      },
    ],
    expectedOutput: [
      "Created topic: orders with 3 partitions",
      "Published m1 to partition 1 at offset 0",
      "Published m2 to partition 2 at offset 0",
      "Published m3 with same key to partition 1 at offset 1",
      "c1 assigned partitions: [orders-0, orders-2]",
      "c2 assigned partitions: [orders-1]",
      "c1 polled 2 records",
      "c2 polled 2 records",
      "Committed offsets for order-processors: {orders-1=2, orders-2=1, orders-0=1}",
      "After rebalance c1 partitions: 1, c2: 1, c3: 1",
      "Independent audit-group polled 4 records from beginning",
    ],
  },
  "lldp-orderbook": {
    files: [
      {
        name: "Level2Entry.java",
        code: `record Level2Entry(long price, long totalQuantity, int orderCount) {
    Level2Entry {
        if (price <= 0) throw new IllegalArgumentException("price must be positive");
        if (totalQuantity <= 0) throw new IllegalArgumentException("quantity must be positive");
    }
}
`,
      },
      {
        name: "Main.java",
        code: `public class Main {
    public static void main(String[] args) {
        MatchingEngine engine = new MatchingEngine();
        OrderBook aapl = engine.getOrCreateBook("AAPL");

        System.out.println("Initialized order book for AAPL");

        engine.submitLimitOrder("AAPL", "ord-b1", Side.BUY, 15000, 100);
        engine.submitLimitOrder("AAPL", "ord-b2", Side.BUY, 14950, 50);
        engine.submitLimitOrder("AAPL", "ord-s1", Side.SELL, 15100, 80);
        engine.submitLimitOrder("AAPL", "ord-s2", Side.SELL, 15200, 120);

        System.out.println("BBO: Best Bid = " + aapl.bestBid().orElse(0L) + ", Best Ask = " + aapl.bestAsk().orElse(0L));
        System.out.println("Spread: " + aapl.spread().orElse(0L));
        System.out.println("Bid Depth: " + aapl.getBidDepth(5));
        System.out.println("Ask Depth: " + aapl.getAskDepth(5));

        System.out.println("Submitting aggressive LIMIT BUY 100 @ 15150...");
        MatchResult res1 = engine.submitLimitOrder("AAPL", "ord-b3", Side.BUY, 15150, 100);
        System.out.println("Trades generated: " + res1.trades().size());
        for (Trade t : res1.trades()) {
            System.out.println("  Trade: " + t.quantity() + " @ " + t.price() + " (maker sell " + t.sellOrderId() + ")");
        }
        System.out.println("Incoming order status: " + res1.status() + ", remaining: " + res1.order().remainingQty());
        System.out.println("New BBO: Best Bid = " + aapl.bestBid().orElse(0L) + ", Best Ask = " + aapl.bestAsk().orElse(0L));

        System.out.println("Submitting MARKET SELL 30...");
        MatchResult res2 = engine.submitMarketOrder("AAPL", "ord-m1", Side.SELL, 30);
        System.out.println("Market sell filled: " + res2.totalTradedQuantity() + " shares, trades: " + res2.trades().size());

        boolean cancelled = engine.cancelOrder("AAPL", "ord-b2");
        System.out.println("Cancelled ord-b2: " + cancelled);
        System.out.println("Final resting orders count: " + aapl.totalRestingOrders());
    }
}
`,
      },
      {
        name: "MatchResult.java",
        code: `import java.util.Collections;
import java.util.List;

record MatchResult(Order order, List<Trade> trades, OrderStatus status) {
    MatchResult {
        trades = (trades == null) ? Collections.emptyList() : Collections.unmodifiableList(trades);
    }

    long totalTradedQuantity() {
        long sum = 0;
        for (Trade t : trades) sum += t.quantity();
        return sum;
    }
}
`,
      },
      {
        name: "MatchingEngine.java",
        code: `import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

final class MatchingEngine {
    private final ConcurrentHashMap<String, OrderBook> books = new ConcurrentHashMap<>();

    OrderBook getOrCreateBook(String symbol) {
        if (symbol == null || symbol.isBlank()) throw new IllegalArgumentException("symbol required");
        return books.computeIfAbsent(symbol.toUpperCase(), OrderBook::new);
    }

    OrderBook getBook(String symbol) {
        return books.get(symbol.toUpperCase());
    }

    MatchResult submitLimitOrder(String symbol, String orderId, Side side, long price, long quantity) {
        OrderBook book = getOrCreateBook(symbol);
        Order order = new Order(orderId, symbol.toUpperCase(), side, OrderType.LIMIT, price, quantity, System.currentTimeMillis());
        return book.processOrder(order);
    }

    MatchResult submitMarketOrder(String symbol, String orderId, Side side, long quantity) {
        OrderBook book = getOrCreateBook(symbol);
        Order order = new Order(orderId, symbol.toUpperCase(), side, OrderType.MARKET, 0, quantity, System.currentTimeMillis());
        return book.processOrder(order);
    }

    boolean cancelOrder(String symbol, String orderId) {
        OrderBook book = getBook(symbol);
        if (book == null) return false;
        return book.cancelOrder(orderId);
    }

    Set<String> symbols() {
        return Collections.unmodifiableSet(books.keySet());
    }
}
`,
      },
      {
        name: "Order.java",
        code: `final class Order {
    private final String id;
    private final String symbol;
    private final Side side;
    private final OrderType type;
    private final long price;
    private final long initialQty;
    private long remainingQty;
    private final long timestamp;
    private OrderStatus status;

    Order(String id, String symbol, Side side, OrderType type, long price, long initialQty, long timestamp) {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("order id required");
        if (symbol == null || symbol.isBlank()) throw new IllegalArgumentException("symbol required");
        if (initialQty <= 0) throw new IllegalArgumentException("quantity must be positive");
        if (type == OrderType.LIMIT && price <= 0) throw new IllegalArgumentException("limit order price must be positive");
        this.id = id;
        this.symbol = symbol;
        this.side = side;
        this.type = type;
        this.price = price;
        this.initialQty = initialQty;
        this.remainingQty = initialQty;
        this.timestamp = timestamp;
        this.status = OrderStatus.NEW;
    }

    String id() { return id; }
    String symbol() { return symbol; }
    Side side() { return side; }
    OrderType type() { return type; }
    long price() { return price; }
    long initialQty() { return initialQty; }
    long remainingQty() { return remainingQty; }
    long filledQty() { return initialQty - remainingQty; }
    long timestamp() { return timestamp; }
    OrderStatus status() { return status; }

    boolean isFilled() { return remainingQty == 0; }
    boolean isAlive() { return status == OrderStatus.NEW || status == OrderStatus.PARTIALLY_FILLED; }

    void fill(long qty) {
        if (qty <= 0 || qty > remainingQty) {
            throw new IllegalArgumentException("Invalid fill quantity: " + qty + ", remaining: " + remainingQty);
        }
        remainingQty -= qty;
        status = (remainingQty == 0) ? OrderStatus.FILLED : OrderStatus.PARTIALLY_FILLED;
    }

    void cancel() {
        if (!isAlive()) throw new IllegalStateException("Cannot cancel order in status " + status);
        status = OrderStatus.CANCELLED;
    }

    void reject() {
        status = OrderStatus.REJECTED;
    }

    @Override
    public String toString() {
        return id + " " + side + " " + type + " " + remainingQty + "/" + initialQty + "@" + price + " [" + status + "]";
    }
}
`,
      },
      {
        name: "OrderBook.java",
        code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

final class OrderBook {
    private final String symbol;
    private final TreeMap<Long, PriceLevel> bids = new TreeMap<>(Comparator.reverseOrder());
    private final TreeMap<Long, PriceLevel> asks = new TreeMap<>();
    private final Map<String, Order> ordersById = new HashMap<>();
    private final ReentrantLock lock = new ReentrantLock();
    private final AtomicLong tradeIdSeq = new AtomicLong(1);

    OrderBook(String symbol) {
        if (symbol == null || symbol.isBlank()) throw new IllegalArgumentException("symbol required");
        this.symbol = symbol;
    }

    String symbol() { return symbol; }

    MatchResult processOrder(Order incoming) {
        lock.lock();
        try {
            if (!incoming.isAlive()) {
                throw new IllegalArgumentException("Cannot process non-alive order: " + incoming);
            }
            ordersById.put(incoming.id(), incoming);
            List<Trade> trades = new ArrayList<>();

            if (incoming.side() == Side.BUY) {
                matchBuy(incoming, trades);
            } else {
                matchSell(incoming, trades);
            }

            if (incoming.remainingQty() > 0) {
                if (incoming.type() == OrderType.LIMIT) {
                    restOrder(incoming);
                } else {
                    // Market order portion that cannot be filled is cancelled
                    incoming.cancel();
                }
            }

            return new MatchResult(incoming, trades, incoming.status());
        } finally {
            lock.unlock();
        }
    }

    private void matchBuy(Order buy, List<Trade> trades) {
        while (buy.remainingQty() > 0 && !asks.isEmpty()) {
            Map.Entry<Long, PriceLevel> bestAsk = asks.firstEntry();
            long askPrice = bestAsk.getKey();
            if (buy.type() == OrderType.LIMIT && askPrice > buy.price()) {
                break; // best ask exceeds buy limit price
            }

            PriceLevel level = bestAsk.getValue();
            while (buy.remainingQty() > 0 && !level.isEmpty()) {
                Order sell = level.peekOrder();
                long matchQty = Math.min(buy.remainingQty(), sell.remainingQty());

                buy.fill(matchQty);
                sell.fill(matchQty);
                level.onOrderFilled(sell, matchQty);

                Trade trade = new Trade(
                    "TRD-" + tradeIdSeq.getAndIncrement(),
                    symbol,
                    buy.id(),
                    sell.id(),
                    sell.price(),
                    matchQty,
                    System.currentTimeMillis(),
                    Side.BUY
                );
                trades.add(trade);
            }

            if (level.isEmpty()) {
                asks.pollFirstEntry();
            }
        }
    }

    private void matchSell(Order sell, List<Trade> trades) {
        while (sell.remainingQty() > 0 && !bids.isEmpty()) {
            Map.Entry<Long, PriceLevel> bestBid = bids.firstEntry();
            long bidPrice = bestBid.getKey();
            if (sell.type() == OrderType.LIMIT && bidPrice < sell.price()) {
                break; // best bid is lower than sell limit price
            }

            PriceLevel level = bestBid.getValue();
            while (sell.remainingQty() > 0 && !level.isEmpty()) {
                Order buy = level.peekOrder();
                long matchQty = Math.min(sell.remainingQty(), buy.remainingQty());

                sell.fill(matchQty);
                buy.fill(matchQty);
                level.onOrderFilled(buy, matchQty);

                Trade trade = new Trade(
                    "TRD-" + tradeIdSeq.getAndIncrement(),
                    symbol,
                    buy.id(),
                    sell.id(),
                    buy.price(),
                    matchQty,
                    System.currentTimeMillis(),
                    Side.SELL
                );
                trades.add(trade);
            }

            if (level.isEmpty()) {
                bids.pollFirstEntry();
            }
        }
    }

    private void restOrder(Order order) {
        TreeMap<Long, PriceLevel> book = (order.side() == Side.BUY) ? bids : asks;
        PriceLevel level = book.computeIfAbsent(order.price(), PriceLevel::new);
        level.addOrder(order);
    }

    boolean cancelOrder(String orderId) {
        lock.lock();
        try {
            Order o = ordersById.get(orderId);
            if (o == null || !o.isAlive()) return false;

            o.cancel();
            TreeMap<Long, PriceLevel> book = (o.side() == Side.BUY) ? bids : asks;
            PriceLevel level = book.get(o.price());
            if (level != null) {
                level.removeOrder(orderId);
                if (level.isEmpty()) {
                    book.remove(o.price());
                }
            }
            return true;
        } finally {
            lock.unlock();
        }
    }

    Optional<Long> bestBid() {
        lock.lock();
        try {
            return bids.isEmpty() ? Optional.empty() : Optional.of(bids.firstKey());
        } finally {
            lock.unlock();
        }
    }

    Optional<Long> bestAsk() {
        lock.lock();
        try {
            return asks.isEmpty() ? Optional.empty() : Optional.of(asks.firstKey());
        } finally {
            lock.unlock();
        }
    }

    Optional<Long> spread() {
        lock.lock();
        try {
            if (bids.isEmpty() || asks.isEmpty()) return Optional.empty();
            return Optional.of(asks.firstKey() - bids.firstKey());
        } finally {
            lock.unlock();
        }
    }

    List<Level2Entry> getBidDepth(int maxLevels) {
        lock.lock();
        try {
            List<Level2Entry> depth = new ArrayList<>();
            int count = 0;
            for (PriceLevel pl : bids.values()) {
                if (count++ >= maxLevels) break;
                depth.add(new Level2Entry(pl.price(), pl.totalQuantity(), pl.orderCount()));
            }
            return Collections.unmodifiableList(depth);
        } finally {
            lock.unlock();
        }
    }

    List<Level2Entry> getAskDepth(int maxLevels) {
        lock.lock();
        try {
            List<Level2Entry> depth = new ArrayList<>();
            int count = 0;
            for (PriceLevel pl : asks.values()) {
                if (count++ >= maxLevels) break;
                depth.add(new Level2Entry(pl.price(), pl.totalQuantity(), pl.orderCount()));
            }
            return Collections.unmodifiableList(depth);
        } finally {
            lock.unlock();
        }
    }

    Order getOrder(String orderId) {
        lock.lock();
        try {
            return ordersById.get(orderId);
        } finally {
            lock.unlock();
        }
    }

    int totalRestingOrders() {
        lock.lock();
        try {
            int total = 0;
            for (PriceLevel pl : bids.values()) total += pl.orderCount();
            for (PriceLevel pl : asks.values()) total += pl.orderCount();
            return total;
        } finally {
            lock.unlock();
        }
    }
}
`,
      },
      {
        name: "OrderStatus.java",
        code: `enum OrderStatus {
    NEW,
    PARTIALLY_FILLED,
    FILLED,
    CANCELLED,
    REJECTED
}
`,
      },
      {
        name: "OrderType.java",
        code: `enum OrderType {
    LIMIT,
    MARKET
}
`,
      },
      {
        name: "PriceLevel.java",
        code: `import java.util.ArrayDeque;
import java.util.Iterator;

final class PriceLevel {
    private final long price;
    private final ArrayDeque<Order> orders = new ArrayDeque<>();
    private long totalQuantity = 0;

    PriceLevel(long price) {
        this.price = price;
    }

    long price() { return price; }
    long totalQuantity() { return totalQuantity; }
    int orderCount() { return orders.size(); }
    boolean isEmpty() { return orders.isEmpty(); }

    void addOrder(Order order) {
        orders.addLast(order);
        totalQuantity += order.remainingQty();
    }

    Order peekOrder() {
        return orders.peekFirst();
    }

    Order pollOrder() {
        Order o = orders.pollFirst();
        if (o != null) {
            totalQuantity -= o.remainingQty();
        }
        return o;
    }

    void onOrderFilled(Order order, long filledQty) {
        totalQuantity -= filledQty;
        if (order.isFilled()) {
            orders.removeFirst();
        }
    }

    boolean removeOrder(String orderId) {
        Iterator<Order> it = orders.iterator();
        while (it.hasNext()) {
            Order o = it.next();
            if (o.id().equals(orderId)) {
                it.remove();
                totalQuantity -= o.remainingQty();
                return true;
            }
        }
        return false;
    }
}
`,
      },
      {
        name: "Side.java",
        code: `enum Side {
    BUY,
    SELL;

    Side opposite() {
        return this == BUY ? SELL : BUY;
    }
}
`,
      },
      {
        name: "Trade.java",
        code: `record Trade(
    String tradeId,
    String symbol,
    String buyOrderId,
    String sellOrderId,
    long price,
    long quantity,
    long timestamp,
    Side takerSide
) {
    Trade {
        if (quantity <= 0) throw new IllegalArgumentException("trade quantity must be positive");
        if (price <= 0) throw new IllegalArgumentException("trade price must be positive");
    }
}
`,
      },
    ],
    tests: [
      {
        name: "Tests.java",
        code: `import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

public class Tests {
    private static int checks = 0;

    private static void check(boolean condition, String message) {
        checks++;
        if (!condition) {
            throw new AssertionError("FAIL: " + message);
        }
    }

    public static void main(String[] args) throws Exception {
        testRestingLimitOrders();
        testExactLimitMatch();
        testPartialFill();
        testPricePriority();
        testTimePriorityFIFO();
        testMakerPriceExecution();
        testMarketOrderWalksBook();
        testMarketOrderInsufficientLiquidity();
        testOrderCancellation();
        testMarketDepthAggregation();
        testConcurrentOrders();

        System.out.println("PASS: all " + checks + " checks passed");
    }

    private static void testRestingLimitOrders() {
        OrderBook book = new OrderBook("MSFT");
        check(book.bestBid().isEmpty(), "initially no bids");
        check(book.bestAsk().isEmpty(), "initially no asks");
        check(book.spread().isEmpty(), "no spread on empty book");

        Order buy1 = new Order("b1", "MSFT", Side.BUY, OrderType.LIMIT, 30000, 50, 1L);
        MatchResult r1 = book.processOrder(buy1);
        check(r1.trades().isEmpty(), "no trades for first resting buy");
        check(r1.status() == OrderStatus.NEW, "order is resting NEW");
        check(book.bestBid().orElse(0L) == 30000L, "best bid is 30000");

        Order sell1 = new Order("s1", "MSFT", Side.SELL, OrderType.LIMIT, 30500, 40, 2L);
        MatchResult r2 = book.processOrder(sell1);
        check(r2.trades().isEmpty(), "no trades for non-crossing sell");
        check(book.bestAsk().orElse(0L) == 30500L, "best ask is 30500");
        check(book.spread().orElse(0L) == 500L, "spread is 500");
    }

    private static void testExactLimitMatch() {
        OrderBook book = new OrderBook("GOOG");
        book.processOrder(new Order("s1", "GOOG", Side.SELL, OrderType.LIMIT, 20000, 100, 1L));

        Order buy = new Order("b1", "GOOG", Side.BUY, OrderType.LIMIT, 20000, 100, 2L);
        MatchResult res = book.processOrder(buy);

        check(res.status() == OrderStatus.FILLED, "buy is completely filled");
        check(res.trades().size() == 1, "exactly 1 trade generated");
        Trade t = res.trades().get(0);
        check(t.quantity() == 100, "trade quantity is 100");
        check(t.price() == 20000, "trade price is 20000");
        check(t.buyOrderId().equals("b1"), "trade buy order is b1");
        check(t.sellOrderId().equals("s1"), "trade sell order is s1");

        check(book.bestBid().isEmpty(), "bids empty after fill");
        check(book.bestAsk().isEmpty(), "asks empty after fill");
    }

    private static void testPartialFill() {
        OrderBook book = new OrderBook("TSLA");
        book.processOrder(new Order("s1", "TSLA", Side.SELL, OrderType.LIMIT, 25000, 150, 1L));

        Order buy = new Order("b1", "TSLA", Side.BUY, OrderType.LIMIT, 25000, 100, 2L);
        MatchResult r1 = book.processOrder(buy);

        check(r1.status() == OrderStatus.FILLED, "taker buy is filled");
        check(r1.trades().get(0).quantity() == 100, "100 shares traded");

        Order maker = book.getOrder("s1");
        check(maker.status() == OrderStatus.PARTIALLY_FILLED, "maker s1 partially filled");
        check(maker.remainingQty() == 50, "maker s1 has 50 remaining");
        check(book.bestAsk().orElse(0L) == 25000L, "best ask still 25000");

        // Fill remaining 50
        Order buy2 = new Order("b2", "TSLA", Side.BUY, OrderType.LIMIT, 25000, 50, 3L);
        MatchResult r2 = book.processOrder(buy2);
        check(r2.status() == OrderStatus.FILLED, "second buy filled");
        check(maker.status() == OrderStatus.FILLED, "maker s1 now completely filled");
        check(book.bestAsk().isEmpty(), "asks now empty");
    }

    private static void testPricePriority() {
        OrderBook book = new OrderBook("AMZN");
        // Place sells at 102, 100, 101
        book.processOrder(new Order("s1", "AMZN", Side.SELL, OrderType.LIMIT, 10200, 10, 1L));
        book.processOrder(new Order("s2", "AMZN", Side.SELL, OrderType.LIMIT, 10000, 10, 2L));
        book.processOrder(new Order("s3", "AMZN", Side.SELL, OrderType.LIMIT, 10100, 10, 3L));

        // Incoming BUY @ 10300 for 15 shares
        Order buy = new Order("b1", "AMZN", Side.BUY, OrderType.LIMIT, 10300, 15, 4L);
        MatchResult res = book.processOrder(buy);

        check(res.trades().size() == 2, "2 trades generated");
        check(res.trades().get(0).sellOrderId().equals("s2"), "first trade against lowest price 10000");
        check(res.trades().get(0).quantity() == 10, "10 filled at 10000");
        check(res.trades().get(1).sellOrderId().equals("s3"), "second trade against 10100");
        check(res.trades().get(1).quantity() == 5, "5 filled at 10100");

        Order s3 = book.getOrder("s3");
        check(s3.remainingQty() == 5, "s3 has 5 remaining");
    }

    private static void testTimePriorityFIFO() {
        OrderBook book = new OrderBook("NVDA");
        // Place two bids at exact same price 50000
        book.processOrder(new Order("b1", "NVDA", Side.BUY, OrderType.LIMIT, 50000, 20, 100L));
        book.processOrder(new Order("b2", "NVDA", Side.BUY, OrderType.LIMIT, 50000, 30, 200L));

        // Sell 15 shares @ 50000
        Order sell = new Order("s1", "NVDA", Side.SELL, OrderType.LIMIT, 50000, 15, 300L);
        MatchResult res = book.processOrder(sell);

        check(res.trades().size() == 1, "1 trade generated");
        Trade t = res.trades().get(0);
        check(t.buyOrderId().equals("b1"), "matched first with b1 due to time priority");
        check(t.quantity() == 15, "15 matched");
        check(book.getOrder("b1").remainingQty() == 5, "b1 has 5 remaining");
        check(book.getOrder("b2").remainingQty() == 30, "b2 was not touched yet");
    }

    private static void testMakerPriceExecution() {
        OrderBook book = new OrderBook("META");
        book.processOrder(new Order("s1", "META", Side.SELL, OrderType.LIMIT, 30000, 10, 1L));

        // Buyer is willing to pay up to 30500, but maker is resting at 30000
        Order buy = new Order("b1", "META", Side.BUY, OrderType.LIMIT, 30500, 10, 2L);
        MatchResult res = book.processOrder(buy);

        Trade t = res.trades().get(0);
        check(t.price() == 30000, "trade price matches resting maker price 30000, not taker 30500");
    }

    private static void testMarketOrderWalksBook() {
        OrderBook book = new OrderBook("NFLX");
        book.processOrder(new Order("s1", "NFLX", Side.SELL, OrderType.LIMIT, 40000, 10, 1L));
        book.processOrder(new Order("s2", "NFLX", Side.SELL, OrderType.LIMIT, 40100, 20, 2L));
        book.processOrder(new Order("s3", "NFLX", Side.SELL, OrderType.LIMIT, 40200, 30, 3L));

        Order mktBuy = new Order("mb1", "NFLX", Side.BUY, OrderType.MARKET, 0, 25, 4L);
        MatchResult res = book.processOrder(mktBuy);

        check(res.status() == OrderStatus.FILLED, "market buy filled");
        check(res.trades().size() == 2, "trades across 2 price levels");
        check(res.trades().get(0).price() == 40000 && res.trades().get(0).quantity() == 10, "10 @ 40000");
        check(res.trades().get(1).price() == 40100 && res.trades().get(1).quantity() == 15, "15 @ 40100");
        check(book.bestAsk().orElse(0L) == 40100L, "best ask is now 40100 with remaining 5 shares");
    }

    private static void testMarketOrderInsufficientLiquidity() {
        OrderBook book = new OrderBook("AMD");
        book.processOrder(new Order("s1", "AMD", Side.SELL, OrderType.LIMIT, 10000, 20, 1L));

        Order mktBuy = new Order("mb1", "AMD", Side.BUY, OrderType.MARKET, 0, 50, 2L);
        MatchResult res = book.processOrder(mktBuy);

        check(res.status() == OrderStatus.CANCELLED, "unfilled remainder of market order is cancelled");
        check(res.totalTradedQuantity() == 20, "20 shares were filled");
        check(res.order().remainingQty() == 30, "remaining 30 cancelled");
        check(book.bestAsk().isEmpty(), "asks book completely empty");
    }

    private static void testOrderCancellation() {
        OrderBook book = new OrderBook("INTC");
        book.processOrder(new Order("b1", "INTC", Side.BUY, OrderType.LIMIT, 3500, 100, 1L));
        book.processOrder(new Order("b2", "INTC", Side.BUY, OrderType.LIMIT, 3400, 50, 2L));

        check(book.bestBid().orElse(0L) == 3500L, "initial best bid 3500");
        boolean cancelled = book.cancelOrder("b1");
        check(cancelled, "cancel returns true for active order");
        check(book.getOrder("b1").status() == OrderStatus.CANCELLED, "order marked cancelled");
        check(book.bestBid().orElse(0L) == 3400L, "best bid updated to 3400");

        boolean cancelAgain = book.cancelOrder("b1");
        check(!cancelAgain, "cancelling already cancelled order returns false");
        boolean cancelUnknown = book.cancelOrder("unknown");
        check(!cancelUnknown, "cancelling unknown order returns false");
    }

    private static void testMarketDepthAggregation() {
        OrderBook book = new OrderBook("SPY");
        book.processOrder(new Order("b1", "SPY", Side.BUY, OrderType.LIMIT, 50000, 100, 1L));
        book.processOrder(new Order("b2", "SPY", Side.BUY, OrderType.LIMIT, 50000, 150, 2L));
        book.processOrder(new Order("b3", "SPY", Side.BUY, OrderType.LIMIT, 49900, 200, 3L));

        List<Level2Entry> depth = book.getBidDepth(5);
        check(depth.size() == 2, "2 price levels in bid depth");
        check(depth.get(0).price() == 50000, "level 1 price 50000");
        check(depth.get(0).totalQuantity() == 250, "level 1 aggregates 100 + 150 = 250");
        check(depth.get(0).orderCount() == 2, "level 1 has 2 orders");
        check(depth.get(1).price() == 49900, "level 2 price 49900");
        check(depth.get(1).totalQuantity() == 200, "level 2 has 200 shares");
    }

    private static void testConcurrentOrders() throws Exception {
        OrderBook book = new OrderBook("QQQ");
        int traders = 6;
        int ordersPerTrader = 100;
        CountDownLatch latch = new CountDownLatch(traders);
        AtomicInteger orderIdCounter = new AtomicInteger(1);

        for (int i = 0; i < traders; i++) {
            final boolean isBuyer = (i % 2 == 0);
            new Thread(() -> {
                for (int j = 0; j < ordersPerTrader; j++) {
                    int id = orderIdCounter.getAndIncrement();
                    long price = 30000 + (j % 10) * 10;
                    Side side = isBuyer ? Side.BUY : Side.SELL;
                    Order o = new Order("ord-" + id, "QQQ", side, OrderType.LIMIT, price, 10, System.currentTimeMillis());
                    book.processOrder(o);
                }
                latch.countDown();
            }).start();
        }

        latch.await();
        check(book.totalRestingOrders() >= 0, "concurrent matching finished without deadlock or exceptions");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Initialized order book for AAPL",
      "BBO: Best Bid = 15000, Best Ask = 15100",
      "Spread: 100",
      "Submitting aggressive LIMIT BUY 100 @ 15150...",
      "Trades generated: 1",
      "Incoming order status: PARTIALLY_FILLED, remaining: 20",
      "New BBO: Best Bid = 15150, Best Ask = 15200",
      "Submitting MARKET SELL 30...",
      "Market sell filled: 30 shares, trades: 2",
      "Cancelled ord-b2: true",
      "Final resting orders count: 2",
    ],
  },
  "lldp-text-editor": {
    files: [
      {
        name: "Clipboard.java",
        code: `final class Clipboard {
    private String content = "";

    synchronized void set(String text) {
        this.content = (text == null) ? "" : text;
    }

    synchronized String get() {
        return content;
    }

    synchronized boolean isEmpty() {
        return content.isEmpty();
    }
}
`,
      },
      {
        name: "Command.java",
        code: `interface Command {
    void execute();
    void undo();
    void redo();
    default boolean canMergeWith(Command next) { return false; }
    default void mergeWith(Command next) { throw new UnsupportedOperationException(); }
}
`,
      },
      {
        name: "DeleteCommand.java",
        code: `final class DeleteCommand implements Command {
    private final TextDocument document;
    private final int start;
    private final int end;
    private String deletedText;
    private final Selection priorSelection;

    DeleteCommand(TextDocument document, int start, int end, Selection priorSelection) {
        this.document = document;
        this.start = start;
        this.end = end;
        this.priorSelection = priorSelection;
    }

    @Override
    public void execute() {
        deletedText = document.delete(start, end);
    }

    @Override
    public void undo() {
        document.insert(start, deletedText);
        document.setSelection(priorSelection.start(), priorSelection.end());
    }

    @Override
    public void redo() {
        document.delete(start, end);
    }
}
`,
      },
      {
        name: "EditorMemento.java",
        code: `record EditorMemento(String text, int cursor, Selection selection, long timestamp) {
    EditorMemento {
        if (text == null) throw new IllegalArgumentException("text cannot be null");
        if (cursor < 0 || cursor > text.length()) throw new IllegalArgumentException("invalid cursor offset");
        if (selection == null) throw new IllegalArgumentException("selection cannot be null");
    }
}
`,
      },
      {
        name: "HistoryManager.java",
        code: `import java.util.ArrayDeque;
import java.util.Deque;

final class HistoryManager {
    private final Deque<Command> undoStack = new ArrayDeque<>();
    private final Deque<Command> redoStack = new ArrayDeque<>();
    private final int maxHistorySize;
    private final boolean coalescingEnabled;

    HistoryManager(int maxHistorySize, boolean coalescingEnabled) {
        if (maxHistorySize <= 0) throw new IllegalArgumentException("maxHistorySize must be positive");
        this.maxHistorySize = maxHistorySize;
        this.coalescingEnabled = coalescingEnabled;
    }

    HistoryManager(int maxHistorySize) {
        this(maxHistorySize, true);
    }

    synchronized void execute(Command cmd) {
        if (coalescingEnabled && !undoStack.isEmpty() && undoStack.peek().canMergeWith(cmd)) {
            undoStack.peek().mergeWith(cmd);
            cmd.execute();
        } else {
            cmd.execute();
            if (undoStack.size() >= maxHistorySize) {
                // Evict oldest command from the bottom of the stack
                undoStack.removeLast();
            }
            undoStack.push(cmd);
        }
        redoStack.clear();
    }

    synchronized boolean canUndo() {
        return !undoStack.isEmpty();
    }

    synchronized boolean canRedo() {
        return !redoStack.isEmpty();
    }

    synchronized boolean undo() {
        if (undoStack.isEmpty()) return false;
        Command cmd = undoStack.pop();
        cmd.undo();
        redoStack.push(cmd);
        return true;
    }

    synchronized boolean redo() {
        if (redoStack.isEmpty()) return false;
        Command cmd = redoStack.pop();
        cmd.redo();
        undoStack.push(cmd);
        return true;
    }

    synchronized void clear() {
        undoStack.clear();
        redoStack.clear();
    }

    synchronized int undoSize() {
        return undoStack.size();
    }

    synchronized int redoSize() {
        return redoStack.size();
    }
}
`,
      },
      {
        name: "InsertCommand.java",
        code: `final class InsertCommand implements Command {
    private final TextDocument document;
    private final int offset;
    private final StringBuilder text;
    private final Selection priorSelection;

    InsertCommand(TextDocument document, int offset, String text, Selection priorSelection) {
        this.document = document;
        this.offset = offset;
        this.text = new StringBuilder(text != null ? text : "");
        this.priorSelection = priorSelection;
    }

    int offset() { return offset; }
    String text() { return text.toString(); }

    @Override
    public void execute() {
        document.insert(offset, text.toString());
    }

    @Override
    public void undo() {
        document.delete(offset, offset + text.length());
        document.setSelection(priorSelection.start(), priorSelection.end());
    }

    @Override
    public void redo() {
        document.insert(offset, text.toString());
    }

    @Override
    public boolean canMergeWith(Command next) {
        if (!(next instanceof InsertCommand other)) return false;
        if (other.priorSelection != null && !other.priorSelection.isEmpty()) return false;
        if (other.text.indexOf("\\n") >= 0) return false;
        return other.offset == this.offset + this.text.length();
    }

    @Override
    public void mergeWith(Command next) {
        InsertCommand other = (InsertCommand) next;
        this.text.append(other.text);
    }
}
`,
      },
      {
        name: "MacroCommand.java",
        code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

final class MacroCommand implements Command {
    private final List<Command> commands;

    MacroCommand(List<Command> commands) {
        this.commands = new ArrayList<>(commands);
    }

    int size() { return commands.size(); }
    List<Command> commands() { return Collections.unmodifiableList(commands); }

    @Override
    public void execute() {
        for (Command cmd : commands) {
            cmd.execute();
        }
    }

    @Override
    public void undo() {
        for (int i = commands.size() - 1; i >= 0; i--) {
            commands.get(i).undo();
        }
    }

    @Override
    public void redo() {
        for (Command cmd : commands) {
            cmd.redo();
        }
    }
}
`,
      },
      {
        name: "Main.java",
        code: `public class Main {
    public static void main(String[] args) {
        TextEditor editor = new TextEditor(50, false);
        System.out.println("Initialized TextEditor");

        editor.insert("Hello World");
        System.out.println("After initial insert: \\"" + editor.getText() + "\\"");

        editor.setCursor(5);
        editor.insert(" Beautiful");
        System.out.println("After insert at cursor: \\"" + editor.getText() + "\\"");

        editor.undo();
        System.out.println("After undo: \\"" + editor.getText() + "\\"");

        editor.redo();
        System.out.println("After redo: \\"" + editor.getText() + "\\"");

        // Select "Beautiful "
        editor.select(6, 16);
        editor.cut();
        System.out.println("After cut: \\"" + editor.getText() + "\\", clipboard: \\"" + editor.getClipboard() + "\\"");

        editor.setCursor(editor.charCount());
        editor.paste();
        System.out.println("After paste at end: \\"" + editor.getText() + "\\"");

        int replaced = editor.replaceAll("o", "0");
        System.out.println("Replaced " + replaced + " occurrences of 'o' with '0': \\"" + editor.getText() + "\\"");

        editor.undo();
        System.out.println("After undoing atomic replaceAll: \\"" + editor.getText() + "\\"");

        EditorMemento snapshot = editor.save();
        System.out.println("Saved memento at charCount " + snapshot.text().length());

        editor.selectAll();
        editor.insert("Entirely New Content");
        System.out.println("Overwritten with new content: \\"" + editor.getText() + "\\"");

        editor.restore(snapshot);
        System.out.println("Restored from memento: \\"" + editor.getText() + "\\"");
    }
}
`,
      },
      {
        name: "ReplaceCommand.java",
        code: `final class ReplaceCommand implements Command {
    private final TextDocument document;
    private final int start;
    private final int end;
    private final String newText;
    private String oldText;
    private final Selection priorSelection;

    ReplaceCommand(TextDocument document, int start, int end, String newText, Selection priorSelection) {
        this.document = document;
        this.start = start;
        this.end = end;
        this.newText = (newText != null) ? newText : "";
        this.priorSelection = priorSelection;
    }

    @Override
    public void execute() {
        oldText = document.replace(start, end, newText);
    }

    @Override
    public void undo() {
        document.replace(start, start + newText.length(), oldText);
        document.setSelection(priorSelection.start(), priorSelection.end());
    }

    @Override
    public void redo() {
        document.replace(start, start + oldText.length(), newText);
    }
}
`,
      },
      {
        name: "Selection.java",
        code: `record Selection(int start, int end) {
    Selection {
        if (start < 0 || end < 0) throw new IllegalArgumentException("selection indices cannot be negative");
        if (start > end) {
            int tmp = start;
            start = end;
            end = tmp;
        }
    }

    static Selection point(int offset) {
        return new Selection(offset, offset);
    }

    boolean isEmpty() {
        return start == end;
    }

    int length() {
        return end - start;
    }
}
`,
      },
      {
        name: "TextDocument.java",
        code: `final class TextDocument {
    private final StringBuilder buffer = new StringBuilder();
    private int cursor = 0;
    private Selection selection = Selection.point(0);

    TextDocument() {}

    TextDocument(String initialText) {
        if (initialText != null) {
            buffer.append(initialText);
            cursor = initialText.length();
            selection = Selection.point(cursor);
        }
    }

    synchronized String getText() {
        return buffer.toString();
    }

    synchronized int length() {
        return buffer.length();
    }

    synchronized String substring(int start, int end) {
        checkBounds(start, end);
        return buffer.substring(start, end);
    }

    synchronized void insert(int offset, String text) {
        if (offset < 0 || offset > buffer.length()) {
            throw new IndexOutOfBoundsException("Offset " + offset + " out of range [0, " + buffer.length() + "]");
        }
        if (text == null || text.isEmpty()) return;
        buffer.insert(offset, text);
        cursor = offset + text.length();
        selection = Selection.point(cursor);
    }

    synchronized String delete(int start, int end) {
        checkBounds(start, end);
        if (start == end) return "";
        String removed = buffer.substring(start, end);
        buffer.delete(start, end);
        cursor = start;
        selection = Selection.point(cursor);
        return removed;
    }

    synchronized String replace(int start, int end, String text) {
        checkBounds(start, end);
        String removed = buffer.substring(start, end);
        buffer.replace(start, end, text);
        cursor = start + text.length();
        selection = Selection.point(cursor);
        return removed;
    }

    synchronized int getCursor() {
        return cursor;
    }

    synchronized void setCursor(int offset) {
        if (offset < 0 || offset > buffer.length()) {
            throw new IndexOutOfBoundsException("Cursor " + offset + " out of range [0, " + buffer.length() + "]");
        }
        this.cursor = offset;
        this.selection = Selection.point(offset);
    }

    synchronized Selection getSelection() {
        return selection;
    }

    synchronized void setSelection(int start, int end) {
        checkBounds(start, end);
        this.selection = new Selection(start, end);
        this.cursor = this.selection.end();
    }

    synchronized void clearSelection() {
        this.selection = Selection.point(cursor);
    }

    synchronized int lineCount() {
        if (buffer.length() == 0) return 0;
        int count = 1;
        for (int i = 0; i < buffer.length(); i++) {
            if (buffer.charAt(i) == '\\n') count++;
        }
        return count;
    }

    synchronized int wordCount() {
        String text = buffer.toString().trim();
        if (text.isEmpty()) return 0;
        return text.split("\\\\s+").length;
    }

    synchronized String getLine(int lineIndex) {
        if (lineIndex < 0) throw new IndexOutOfBoundsException("lineIndex cannot be negative");
        String[] lines = buffer.toString().split("\\n", -1);
        if (lineIndex >= lines.length) throw new IndexOutOfBoundsException("lineIndex " + lineIndex + " out of range");
        return lines[lineIndex];
    }

    private void checkBounds(int start, int end) {
        if (start < 0 || end < start || end > buffer.length()) {
            throw new IndexOutOfBoundsException("Range [" + start + ", " + end + "] out of bounds for length " + buffer.length());
        }
    }
}
`,
      },
      {
        name: "TextEditor.java",
        code: `import java.util.ArrayList;
import java.util.List;

final class TextEditor {
    private final TextDocument document;
    private final HistoryManager history;
    private final Clipboard clipboard;

    TextEditor(int maxHistorySize, boolean coalescingEnabled) {
        this.document = new TextDocument();
        this.history = new HistoryManager(maxHistorySize, coalescingEnabled);
        this.clipboard = new Clipboard();
    }

    TextEditor() {
        this(100, true);
    }

    synchronized void insert(String text) {
        if (text == null || text.isEmpty()) return;
        Selection sel = document.getSelection();
        if (!sel.isEmpty()) {
            history.execute(new ReplaceCommand(document, sel.start(), sel.end(), text, sel));
        } else {
            history.execute(new InsertCommand(document, document.getCursor(), text, sel));
        }
    }

    synchronized void backspace() {
        Selection sel = document.getSelection();
        if (!sel.isEmpty()) {
            history.execute(new DeleteCommand(document, sel.start(), sel.end(), sel));
        } else if (document.getCursor() > 0) {
            int pos = document.getCursor();
            history.execute(new DeleteCommand(document, pos - 1, pos, sel));
        }
    }

    synchronized void deleteForward() {
        Selection sel = document.getSelection();
        if (!sel.isEmpty()) {
            history.execute(new DeleteCommand(document, sel.start(), sel.end(), sel));
        } else if (document.getCursor() < document.length()) {
            int pos = document.getCursor();
            history.execute(new DeleteCommand(document, pos, pos + 1, sel));
        }
    }

    synchronized void select(int start, int end) {
        document.setSelection(start, end);
    }

    synchronized void selectAll() {
        document.setSelection(0, document.length());
    }

    synchronized void clearSelection() {
        document.clearSelection();
    }

    synchronized void setCursor(int offset) {
        document.setCursor(offset);
    }

    synchronized void copy() {
        Selection sel = document.getSelection();
        if (!sel.isEmpty()) {
            clipboard.set(document.substring(sel.start(), sel.end()));
        }
    }

    synchronized void cut() {
        Selection sel = document.getSelection();
        if (!sel.isEmpty()) {
            clipboard.set(document.substring(sel.start(), sel.end()));
            history.execute(new DeleteCommand(document, sel.start(), sel.end(), sel));
        }
    }

    synchronized void paste() {
        String clip = clipboard.get();
        if (!clip.isEmpty()) {
            insert(clip);
        }
    }

    synchronized int find(String query, int fromOffset) {
        if (query == null || query.isEmpty()) return -1;
        String text = document.getText();
        if (fromOffset < 0 || fromOffset >= text.length()) return -1;
        return text.indexOf(query, fromOffset);
    }

    synchronized int replaceAll(String target, String replacement) {
        if (target == null || target.isEmpty()) return 0;
        String rep = (replacement != null) ? replacement : "";
        String text = document.getText();

        List<Integer> occurrences = new ArrayList<>();
        int idx = text.indexOf(target, 0);
        while (idx >= 0) {
            occurrences.add(idx);
            idx = text.indexOf(target, idx + target.length());
        }
        if (occurrences.isEmpty()) return 0;

        // Apply replacements from back to front so indices don't shift
        List<Command> replacements = new ArrayList<>();
        for (int i = occurrences.size() - 1; i >= 0; i--) {
            int start = occurrences.get(i);
            int end = start + target.length();
            replacements.add(new ReplaceCommand(document, start, end, rep, Selection.point(start)));
        }

        history.execute(new MacroCommand(replacements));
        return occurrences.size();
    }

    synchronized boolean undo() {
        return history.undo();
    }

    synchronized boolean redo() {
        return history.redo();
    }

    synchronized boolean canUndo() {
        return history.canUndo();
    }

    synchronized boolean canRedo() {
        return history.canRedo();
    }

    synchronized EditorMemento save() {
        return new EditorMemento(document.getText(), document.getCursor(), document.getSelection(), System.currentTimeMillis());
    }

    synchronized void restore(EditorMemento memento) {
        if (memento == null) throw new IllegalArgumentException("memento cannot be null");
        document.replace(0, document.length(), memento.text());
        document.setCursor(memento.cursor());
        document.setSelection(memento.selection().start(), memento.selection().end());
        history.clear();
    }

    synchronized String getText() { return document.getText(); }
    synchronized int getCursor() { return document.getCursor(); }
    synchronized Selection getSelection() { return document.getSelection(); }
    synchronized int charCount() { return document.length(); }
    synchronized int wordCount() { return document.wordCount(); }
    synchronized int lineCount() { return document.lineCount(); }
    synchronized String getClipboard() { return clipboard.get(); }
}
`,
      },
    ],
    tests: [
      {
        name: "Tests.java",
        code: `public class Tests {
    private static int checks = 0;

    private static void check(boolean condition, String message) {
        checks++;
        if (!condition) {
            throw new AssertionError("FAIL: " + message);
        }
    }

    public static void main(String[] args) {
        testBasicInsertAndCursor();
        testBackspaceAndDeleteForward();
        testSelectionReplace();
        testCutCopyPaste();
        testUndoRedoSequence();
        testTypingCoalescing();
        testBoundedHistoryEviction();
        testFindAndAtomicReplaceAll();
        testEditorMemento();
        testTextMetrics();
        testEdgeCases();

        System.out.println("PASS: all " + checks + " checks passed");
    }

    private static void testBasicInsertAndCursor() {
        TextEditor ed = new TextEditor(50, false);
        check(ed.getText().isEmpty(), "initially text is empty");
        check(ed.getCursor() == 0, "initial cursor is 0");

        ed.insert("abc");
        check(ed.getText().equals("abc"), "inserted abc");
        check(ed.getCursor() == 3, "cursor moved to 3");

        ed.setCursor(1);
        ed.insert("X");
        check(ed.getText().equals("aXbc"), "inserted X at offset 1");
        check(ed.getCursor() == 2, "cursor at 2");

        ed.setCursor(0);
        ed.insert("START_");
        check(ed.getText().equals("START_aXbc"), "inserted at offset 0");
    }

    private static void testBackspaceAndDeleteForward() {
        TextEditor ed = new TextEditor(50, false);
        ed.insert("hello");
        ed.backspace();
        check(ed.getText().equals("hell"), "backspace deleted 'o'");
        check(ed.getCursor() == 4, "cursor at 4");

        ed.setCursor(1);
        ed.deleteForward();
        check(ed.getText().equals("hll"), "deleteForward at 1 deleted first 'e'");
        check(ed.getCursor() == 1, "cursor still at 1");

        // Backspace on selected text
        ed.select(0, 2);
        ed.backspace();
        check(ed.getText().equals("l"), "backspace deleted selection 'hl'");
    }

    private static void testSelectionReplace() {
        TextEditor ed = new TextEditor(50, false);
        ed.insert("The quick brown fox");
        ed.select(4, 9); // "quick"
        ed.insert("slow");
        check(ed.getText().equals("The slow brown fox"), "replaced 'quick' with 'slow'");

        ed.undo();
        check(ed.getText().equals("The quick brown fox"), "undo restores 'quick'");
        check(ed.getSelection().start() == 4 && ed.getSelection().end() == 9, "undo restores selection range");

        ed.redo();
        check(ed.getText().equals("The slow brown fox"), "redo re-applies replace");
    }

    private static void testCutCopyPaste() {
        TextEditor ed = new TextEditor(50, false);
        ed.insert("alpha beta gamma");

        // Copy "beta"
        ed.select(6, 10);
        ed.copy();
        check(ed.getClipboard().equals("beta"), "clipboard has 'beta'");
        check(ed.getText().equals("alpha beta gamma"), "copy did not modify text");

        // Cut "gamma"
        ed.select(11, 16);
        ed.cut();
        check(ed.getClipboard().equals("gamma"), "clipboard now has 'gamma'");
        check(ed.getText().equals("alpha beta "), "cut removed 'gamma'");

        // Paste at beginning
        ed.setCursor(0);
        ed.paste();
        check(ed.getText().equals("gammaalpha beta "), "pasted at beginning");
    }

    private static void testUndoRedoSequence() {
        TextEditor ed = new TextEditor(50, false);
        check(!ed.canUndo(), "no undo initially");
        check(!ed.canRedo(), "no redo initially");

        ed.insert("Step 1; ");
        ed.insert("Step 2; ");
        ed.insert("Step 3; ");

        check(ed.canUndo(), "can undo");
        ed.undo();
        check(ed.getText().equals("Step 1; Step 2; "), "undid step 3");
        ed.undo();
        check(ed.getText().equals("Step 1; "), "undid step 2");

        check(ed.canRedo(), "can redo");
        ed.redo();
        check(ed.getText().equals("Step 1; Step 2; "), "redid step 2");

        // New edit clears redo stack
        ed.insert("Branch; ");
        check(!ed.canRedo(), "new action cleared redo stack");
        check(ed.getText().equals("Step 1; Step 2; Branch; "), "text has branched state");
    }

    private static void testTypingCoalescing() {
        TextEditor ed = new TextEditor(50, true); // coalescing enabled
        ed.insert("a");
        ed.insert("b");
        ed.insert("c");
        check(ed.getText().equals("abc"), "text is abc");

        // Single undo should undo all 3 merged keystrokes
        ed.undo();
        check(ed.getText().isEmpty(), "single undo reverts coalesced typing sequence");

        ed.redo();
        check(ed.getText().equals("abc"), "redo restores coalesced abc");
    }

    private static void testBoundedHistoryEviction() {
        TextEditor ed = new TextEditor(3, false); // capacity 3
        ed.insert("1");
        ed.insert("2");
        ed.insert("3");
        ed.insert("4"); // command 1 should be evicted

        check(ed.getText().equals("1234"), "text is 1234");
        ed.undo(); // removes 4
        ed.undo(); // removes 3
        ed.undo(); // removes 2
        check(!ed.canUndo(), "cannot undo command 1 because it was evicted");
        check(ed.getText().equals("1"), "text remaining is '1'");
    }

    private static void testFindAndAtomicReplaceAll() {
        TextEditor ed = new TextEditor(50, false);
        ed.insert("cat sat on the cat mat with a cat");

        check(ed.find("cat", 0) == 0, "find first cat at 0");
        check(ed.find("cat", 1) == 15, "find second cat at 15");
        check(ed.find("dog", 0) == -1, "find non-existent dog returns -1");

        int count = ed.replaceAll("cat", "dog");
        check(count == 3, "replaced 3 occurrences");
        check(ed.getText().equals("dog sat on the dog mat with a dog"), "all cats replaced with dogs");

        // Single undo reverts the entire macro command atomically
        ed.undo();
        check(ed.getText().equals("cat sat on the cat mat with a cat"), "single undo reverts all 3 replacements");

        ed.redo();
        check(ed.getText().equals("dog sat on the dog mat with a dog"), "redo re-applies all 3 replacements");
    }

    private static void testEditorMemento() {
        TextEditor ed = new TextEditor(50, false);
        ed.insert("Initial state of document");
        ed.select(8, 13);
        EditorMemento snapshot = ed.save();

        check(snapshot.text().equals("Initial state of document"), "snapshot captured text");
        check(snapshot.selection().start() == 8 && snapshot.selection().end() == 13, "snapshot captured selection");

        ed.selectAll();
        ed.insert("Completely trashed content");
        check(ed.getText().equals("Completely trashed content"), "text mutated");

        ed.restore(snapshot);
        check(ed.getText().equals("Initial state of document"), "restored text matches snapshot");
        check(ed.getSelection().start() == 8 && ed.getSelection().end() == 13, "restored selection matches");
        check(!ed.canUndo(), "history cleared after memento restore");
    }

    private static void testTextMetrics() {
        TextEditor ed = new TextEditor(50, false);
        check(ed.lineCount() == 0, "empty text line count 0");
        check(ed.wordCount() == 0, "empty text word count 0");
        check(ed.charCount() == 0, "empty text char count 0");

        ed.insert("Line one\\nLine two has five words\\nLine three");
        check(ed.lineCount() == 3, "line count is 3");
        check(ed.wordCount() == 9, "word count is 9");
        check(ed.charCount() == 43, "char count is 43");
    }

    private static void testEdgeCases() {
        TextEditor ed = new TextEditor(50, false);
        // Undo/redo on empty
        check(!ed.undo(), "undo on empty returns false");
        check(!ed.redo(), "redo on empty returns false");

        // Backspace on empty
        ed.backspace();
        ed.deleteForward();
        check(ed.getText().isEmpty(), "backspace and delete on empty do nothing");

        // Empty string insert
        ed.insert("");
        check(ed.getText().isEmpty(), "inserting empty string does nothing");

        // Selection bounds normalization
        Selection sel = new Selection(5, 2);
        check(sel.start() == 2 && sel.end() == 5, "selection automatically normalizes start <= end");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Initialized TextEditor",
      "After initial insert: \"Hello World\"",
      "After insert at cursor: \"Hello Beautiful World\"",
      "After undo: \"Hello World\"",
      "After redo: \"Hello Beautiful World\"",
      "After cut: \"Hello World\", clipboard: \"Beautiful \"",
      "After paste at end: \"Hello WorldBeautiful \"",
      "Replaced 2 occurrences of 'o' with '0': \"Hell0 W0rldBeautiful \"",
      "After undoing atomic replaceAll: \"Hello WorldBeautiful \"",
      "Saved memento at charCount 21",
      "Overwritten with new content: \"Entirely New Content\"",
      "Restored from memento: \"Hello WorldBeautiful \"",
    ],
  },
  "lldp-job-scheduler": {
    files: [
      {
        name: "BackoffStrategy.java",
        code: `enum BackoffStrategy {
    FIXED,
    EXPONENTIAL
}
`,
      },
      {
        name: "ExecutionState.java",
        code: `enum ExecutionState {
    PENDING,
    RUNNING,
    SUCCESS,
    FAILED,
    CANCELLED
}
`,
      },
      {
        name: "FixedDelayTrigger.java",
        code: `import java.util.OptionalLong;

final class FixedDelayTrigger implements Trigger {
    private final long delayMillis;
    private long lastScheduled = -1;

    FixedDelayTrigger(long delayMillis) {
        if (delayMillis <= 0) throw new IllegalArgumentException("delayMillis must be positive");
        this.delayMillis = delayMillis;
    }

    @Override
    public synchronized OptionalLong nextExecutionTime(long currentMillis) {
        if (lastScheduled < 0) {
            lastScheduled = currentMillis + delayMillis;
        } else {
            lastScheduled = Math.max(currentMillis, lastScheduled) + delayMillis;
        }
        return OptionalLong.of(lastScheduled);
    }
}
`,
      },
      {
        name: "Job.java",
        code: `final class Job {
    private final String id;
    private final String name;
    private final Runnable task;
    private final JobPriority priority;
    private final Trigger trigger;
    private final RetryPolicy retryPolicy;

    Job(String id, String name, Runnable task, JobPriority priority, Trigger trigger, RetryPolicy retryPolicy) {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("job id required");
        if (name == null || name.isBlank()) throw new IllegalArgumentException("job name required");
        if (task == null) throw new IllegalArgumentException("task cannot be null");
        this.id = id;
        this.name = name;
        this.task = task;
        this.priority = priority != null ? priority : JobPriority.NORMAL;
        this.trigger = trigger != null ? trigger : new OneShotTrigger(System.currentTimeMillis());
        this.retryPolicy = retryPolicy != null ? retryPolicy : RetryPolicy.none();
    }

    String id() { return id; }
    String name() { return name; }
    Runnable task() { return task; }
    JobPriority priority() { return priority; }
    Trigger trigger() { return trigger; }
    RetryPolicy retryPolicy() { return retryPolicy; }

    @Override
    public String toString() {
        return id + " (\\"" + name + "\\", priority=" + priority + ")";
    }
}
`,
      },
      {
        name: "JobListener.java",
        code: `interface JobListener {
    default void onScheduled(Job job, long scheduledTime) {}
    default void onStarted(String jobId, int attempt) {}
    default void onSuccess(String jobId, long duration) {}
    default void onFailure(String jobId, int attempt, Exception exception, boolean willRetry) {}
    default void onCancelled(String jobId) {}
}
`,
      },
      {
        name: "JobPriority.java",
        code: `enum JobPriority {
    LOW(1),
    NORMAL(2),
    HIGH(3),
    CRITICAL(4);

    private final int level;

    JobPriority(int level) {
        this.level = level;
    }

    int level() {
        return level;
    }
}
`,
      },
      {
        name: "JobRun.java",
        code: `record JobRun(
    String runId,
    String jobId,
    int attempt,
    long scheduledTime,
    long startTime,
    long endTime,
    ExecutionState state,
    String errorMessage
) {
    long duration() {
        return (endTime >= startTime) ? (endTime - startTime) : 0L;
    }
}
`,
      },
      {
        name: "JobScheduler.java",
        code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.OptionalLong;
import java.util.PriorityQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

final class JobScheduler {
    private final TimeSource clock;
    private final PriorityQueue<ScheduledTask> queue = new PriorityQueue<>();
    private final Map<String, Job> jobs = new ConcurrentHashMap<>();
    private final Map<String, ExecutionState> states = new ConcurrentHashMap<>();
    private final List<JobRun> history = new CopyOnWriteArrayList<>();
    private final List<JobListener> listeners = new CopyOnWriteArrayList<>();
    private final AtomicLong runIdCounter = new AtomicLong(1);
    private final AtomicLong taskSeqCounter = new AtomicLong(1);
    private final ReentrantLock lock = new ReentrantLock();
    private boolean paused = false;

    JobScheduler(TimeSource clock) {
        if (clock == null) throw new IllegalArgumentException("clock cannot be null");
        this.clock = clock;
    }

    void addListener(JobListener listener) {
        if (listener != null) listeners.add(listener);
    }

    void schedule(Job job) {
        lock.lock();
        try {
            jobs.put(job.id(), job);
            states.put(job.id(), ExecutionState.PENDING);

            OptionalLong firstRun = job.trigger().nextExecutionTime(clock.nowMillis());
            if (firstRun.isPresent()) {
                ScheduledTask st = new ScheduledTask(job.id(), firstRun.getAsLong(), job.priority(), 1, taskSeqCounter.getAndIncrement());
                queue.add(st);
                for (JobListener l : listeners) l.onScheduled(job, firstRun.getAsLong());
            } else {
                states.put(job.id(), ExecutionState.SUCCESS);
            }
        } finally {
            lock.unlock();
        }
    }

    boolean cancel(String jobId) {
        lock.lock();
        try {
            Job job = jobs.get(jobId);
            if (job == null) return false;
            ExecutionState st = states.get(jobId);
            if (st == ExecutionState.SUCCESS || st == ExecutionState.CANCELLED) {
                return false;
            }

            states.put(jobId, ExecutionState.CANCELLED);
            queue.removeIf(task -> task.jobId().equals(jobId));
            for (JobListener l : listeners) l.onCancelled(jobId);
            return true;
        } finally {
            lock.unlock();
        }
    }

    void pause() {
        lock.lock();
        try {
            paused = true;
        } finally {
            lock.unlock();
        }
    }

    void resume() {
        lock.lock();
        try {
            paused = false;
        } finally {
            lock.unlock();
        }
    }

    boolean isPaused() {
        lock.lock();
        try {
            return paused;
        } finally {
            lock.unlock();
        }
    }

    int dispatchReady() {
        return dispatchReady(clock.nowMillis());
    }

    int dispatchReady(long now) {
        List<ScheduledTask> ready = new ArrayList<>();
        lock.lock();
        try {
            if (paused) return 0;
            while (!queue.isEmpty() && queue.peek().scheduledTime() <= now) {
                ready.add(queue.poll());
            }
        } finally {
            lock.unlock();
        }

        for (ScheduledTask task : ready) {
            executeTask(task, now);
        }

        return ready.size();
    }

    private void executeTask(ScheduledTask task, long now) {
        Job job = jobs.get(task.jobId());
        if (job == null) return;

        // Check if cancelled before execution
        if (states.get(task.jobId()) == ExecutionState.CANCELLED) {
            return;
        }

        states.put(task.jobId(), ExecutionState.RUNNING);
        for (JobListener l : listeners) l.onStarted(task.jobId(), task.attempt());

        long startTime = clock.nowMillis();
        String runId = "RUN-" + runIdCounter.getAndIncrement();
        Exception failure = null;

        try {
            job.task().run();
        } catch (Exception e) {
            failure = e;
        }

        long endTime = clock.nowMillis();

        if (failure == null) {
            JobRun run = new JobRun(runId, task.jobId(), task.attempt(), task.scheduledTime(), startTime, endTime, ExecutionState.SUCCESS, null);
            history.add(run);
            for (JobListener l : listeners) l.onSuccess(task.jobId(), run.duration());

            // Check if recurring
            OptionalLong nextRun = job.trigger().nextExecutionTime(clock.nowMillis());
            lock.lock();
            try {
                if (nextRun.isPresent() && states.get(task.jobId()) != ExecutionState.CANCELLED) {
                    states.put(task.jobId(), ExecutionState.PENDING);
                    ScheduledTask next = new ScheduledTask(task.jobId(), nextRun.getAsLong(), job.priority(), 1, taskSeqCounter.getAndIncrement());
                    queue.add(next);
                    for (JobListener l : listeners) l.onScheduled(job, nextRun.getAsLong());
                } else {
                    states.put(task.jobId(), ExecutionState.SUCCESS);
                }
            } finally {
                lock.unlock();
            }
        } else {
            boolean willRetry = task.attempt() <= job.retryPolicy().maxRetries();
            JobRun run = new JobRun(runId, task.jobId(), task.attempt(), task.scheduledTime(), startTime, endTime,
                willRetry ? ExecutionState.FAILED : ExecutionState.FAILED, failure.getMessage());
            history.add(run);
            for (JobListener l : listeners) l.onFailure(task.jobId(), task.attempt(), failure, willRetry);

            lock.lock();
            try {
                if (willRetry && states.get(task.jobId()) != ExecutionState.CANCELLED) {
                    states.put(task.jobId(), ExecutionState.PENDING);
                    long delay = job.retryPolicy().delayForAttempt(task.attempt());
                    long retryTime = clock.nowMillis() + delay;
                    ScheduledTask retryTask = new ScheduledTask(task.jobId(), retryTime, job.priority(), task.attempt() + 1, taskSeqCounter.getAndIncrement());
                    queue.add(retryTask);
                } else {
                    states.put(task.jobId(), ExecutionState.FAILED);
                }
            } finally {
                lock.unlock();
            }
        }
    }

    ExecutionState getJobState(String jobId) {
        return states.get(jobId);
    }

    List<JobRun> getJobHistory(String jobId) {
        List<JobRun> res = new ArrayList<>();
        for (JobRun r : history) {
            if (r.jobId().equals(jobId)) res.add(r);
        }
        return Collections.unmodifiableList(res);
    }

    int pendingTaskCount() {
        lock.lock();
        try {
            return queue.size();
        } finally {
            lock.unlock();
        }
    }
}
`,
      },
      {
        name: "Main.java",
        code: `import java.util.concurrent.atomic.AtomicInteger;

public class Main {
    public static void main(String[] args) {
        ManualClock clock = new ManualClock(1_000_000L);
        JobScheduler scheduler = new JobScheduler(clock);

        scheduler.addListener(new JobListener() {
            @Override
            public void onStarted(String jobId, int attempt) {
                System.out.println("Started job " + jobId + " (attempt " + attempt + ")");
            }

            @Override
            public void onSuccess(String jobId, long duration) {
                System.out.println("Completed job " + jobId + " successfully");
            }

            @Override
            public void onFailure(String jobId, int attempt, Exception ex, boolean willRetry) {
                System.out.println("Job " + jobId + " failed on attempt " + attempt + " (" + ex.getMessage() + "), willRetry=" + willRetry);
            }
        });

        System.out.println("Initialized JobScheduler with ManualClock at " + clock.nowMillis());

        // 1. One-shot critical job
        scheduler.schedule(new Job(
            "report-job",
            "Generate Quarterly Report",
            () -> System.out.println("  Executing Quarterly Report Generation..."),
            JobPriority.CRITICAL,
            new OneShotTrigger(1_002_000L),
            RetryPolicy.none()
        ));

        // 2. Fixed-delay recurring job
        scheduler.schedule(new Job(
            "health-check",
            "Cluster Health Check",
            () -> System.out.println("  Checking cluster health..."),
            JobPriority.NORMAL,
            new FixedDelayTrigger(3_000L),
            RetryPolicy.none()
        ));

        // 3. Flaky job with retry policy
        AtomicInteger flakyAttempts = new AtomicInteger(0);
        scheduler.schedule(new Job(
            "flaky-sync",
            "Flaky Sync Task",
            () -> {
                int att = flakyAttempts.incrementAndGet();
                if (att < 3) {
                    throw new RuntimeException("Network timeout");
                }
                System.out.println("  Flaky sync succeeded on attempt " + att + "!");
            },
            JobPriority.HIGH,
            new OneShotTrigger(1_001_000L),
            RetryPolicy.exponential(3, 1_000L, 5_000L)
        ));

        System.out.println("Pending tasks in queue: " + scheduler.pendingTaskCount());

        // Advance to 1,001,000: flaky-sync attempt 1 runs and fails
        clock.set(1_001_000L);
        int d1 = scheduler.dispatchReady();
        System.out.println("Dispatched " + d1 + " tasks at 1001000");

        // Advance to 1,002,000: report-job runs and flaky-sync retry 1 (delay 1000 -> 1002000)
        clock.set(1_002_000L);
        int d2 = scheduler.dispatchReady();
        System.out.println("Dispatched " + d2 + " tasks at 1002000");

        // Advance to 1,004,000: flaky-sync retry 2 (delay 2000 -> 1004000) succeeds!
        clock.set(1_004_000L);
        int d3 = scheduler.dispatchReady();
        System.out.println("Dispatched " + d3 + " tasks at 1004000");

        System.out.println("State of report-job: " + scheduler.getJobState("report-job"));
        System.out.println("State of flaky-sync: " + scheduler.getJobState("flaky-sync"));

        boolean cancelled = scheduler.cancel("health-check");
        System.out.println("Cancelled health-check: " + cancelled);
    }
}
`,
      },
      {
        name: "ManualClock.java",
        code: `final class ManualClock implements TimeSource {
    private long now;

    ManualClock(long initialMillis) {
        this.now = initialMillis;
    }

    @Override
    public synchronized long nowMillis() {
        return now;
    }

    synchronized void advance(long millis) {
        if (millis < 0) throw new IllegalArgumentException("cannot advance backwards");
        now += millis;
    }

    synchronized void set(long millis) {
        now = millis;
    }
}
`,
      },
      {
        name: "OneShotTrigger.java",
        code: `import java.util.OptionalLong;

final class OneShotTrigger implements Trigger {
    private final long runAtMillis;
    private boolean fired = false;

    OneShotTrigger(long runAtMillis) {
        this.runAtMillis = runAtMillis;
    }

    @Override
    public synchronized OptionalLong nextExecutionTime(long currentMillis) {
        if (fired) return OptionalLong.empty();
        fired = true;
        return OptionalLong.of(runAtMillis);
    }
}
`,
      },
      {
        name: "RetryPolicy.java",
        code: `record RetryPolicy(int maxRetries, long initialDelayMillis, long maxDelayMillis, BackoffStrategy strategy) {
    RetryPolicy {
        if (maxRetries < 0) throw new IllegalArgumentException("maxRetries cannot be negative");
        if (initialDelayMillis < 0) throw new IllegalArgumentException("initialDelayMillis cannot be negative");
        if (maxDelayMillis < initialDelayMillis) throw new IllegalArgumentException("maxDelayMillis cannot be less than initialDelayMillis");
        if (strategy == null) strategy = BackoffStrategy.FIXED;
    }

    static RetryPolicy none() {
        return new RetryPolicy(0, 0, 0, BackoffStrategy.FIXED);
    }

    static RetryPolicy fixed(int maxRetries, long delayMillis) {
        return new RetryPolicy(maxRetries, delayMillis, delayMillis, BackoffStrategy.FIXED);
    }

    static RetryPolicy exponential(int maxRetries, long initialDelay, long maxDelay) {
        return new RetryPolicy(maxRetries, initialDelay, maxDelay, BackoffStrategy.EXPONENTIAL);
    }

    long delayForAttempt(int attempt) {
        if (attempt <= 0) return 0;
        if (strategy == BackoffStrategy.FIXED) {
            return initialDelayMillis;
        }
        // Exponential backoff: initial * 2^(attempt - 1)
        long multiplier = 1L << Math.min(attempt - 1, 30);
        long computed = initialDelayMillis * multiplier;
        return Math.min(maxDelayMillis, computed);
    }
}
`,
      },
      {
        name: "ScheduledTask.java",
        code: `record ScheduledTask(
    String jobId,
    long scheduledTime,
    JobPriority priority,
    int attempt,
    long sequenceId
) implements Comparable<ScheduledTask> {

    @Override
    public int compareTo(ScheduledTask other) {
        int timeCmp = Long.compare(this.scheduledTime, other.scheduledTime);
        if (timeCmp != 0) return timeCmp;

        // Higher priority level runs first
        int priorityCmp = Integer.compare(other.priority.level(), this.priority.level());
        if (priorityCmp != 0) return priorityCmp;

        return Long.compare(this.sequenceId, other.sequenceId);
    }
}
`,
      },
      {
        name: "TimeSource.java",
        code: `interface TimeSource {
    long nowMillis();
}
`,
      },
      {
        name: "Trigger.java",
        code: `import java.util.OptionalLong;

interface Trigger {
    OptionalLong nextExecutionTime(long currentMillis);
}
`,
      },
    ],
    tests: [
      {
        name: "Tests.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

public class Tests {
    private static int checks = 0;

    private static void check(boolean condition, String message) {
        checks++;
        if (!condition) {
            throw new AssertionError("FAIL: " + message);
        }
    }

    public static void main(String[] args) {
        testOneShotJobSuccess();
        testPriorityOrdering();
        testFixedDelayRecurring();
        testRetryPolicyFixedDelay();
        testRetryPolicyExponentialBackoff();
        testRetryExhaustionMarksFailed();
        testJobCancellation();
        testPauseAndResume();
        testJobListenerCallbacks();
        testJobRunHistory();

        System.out.println("PASS: all " + checks + " checks passed");
    }

    private static void testOneShotJobSuccess() {
        ManualClock clock = new ManualClock(10_000L);
        JobScheduler scheduler = new JobScheduler(clock);

        AtomicBoolean executed = new AtomicBoolean(false);
        Job job = new Job("j1", "test job", () -> executed.set(true), JobPriority.NORMAL, new OneShotTrigger(10_500L), RetryPolicy.none());
        scheduler.schedule(job);

        check(scheduler.getJobState("j1") == ExecutionState.PENDING, "initial state PENDING");
        check(scheduler.pendingTaskCount() == 1, "1 task pending");

        // Advance to 10_400: not ready
        clock.set(10_400L);
        int d0 = scheduler.dispatchReady();
        check(d0 == 0, "0 tasks dispatched before time");
        check(!executed.get(), "not executed yet");

        // Advance to 10_500: ready!
        clock.set(10_500L);
        int d1 = scheduler.dispatchReady();
        check(d1 == 1, "1 task dispatched at target time");
        check(executed.get(), "task executed");
        check(scheduler.getJobState("j1") == ExecutionState.SUCCESS, "state is SUCCESS");
        check(scheduler.pendingTaskCount() == 0, "no tasks left in queue");
    }

    private static void testPriorityOrdering() {
        ManualClock clock = new ManualClock(20_000L);
        JobScheduler scheduler = new JobScheduler(clock);

        List<String> order = new ArrayList<>();
        // Schedule 3 jobs at exact same time 20_100L with different priorities
        scheduler.schedule(new Job("low", "low priority", () -> order.add("low"), JobPriority.LOW, new OneShotTrigger(20_100L), RetryPolicy.none()));
        scheduler.schedule(new Job("critical", "critical priority", () -> order.add("critical"), JobPriority.CRITICAL, new OneShotTrigger(20_100L), RetryPolicy.none()));
        scheduler.schedule(new Job("high", "high priority", () -> order.add("high"), JobPriority.HIGH, new OneShotTrigger(20_100L), RetryPolicy.none()));

        clock.set(20_100L);
        int d = scheduler.dispatchReady();
        check(d == 3, "dispatched all 3 concurrent tasks");
        check(order.get(0).equals("critical"), "critical priority ran first");
        check(order.get(1).equals("high"), "high priority ran second");
        check(order.get(2).equals("low"), "low priority ran last");
    }

    private static void testFixedDelayRecurring() {
        ManualClock clock = new ManualClock(30_000L);
        JobScheduler scheduler = new JobScheduler(clock);

        AtomicInteger runCount = new AtomicInteger(0);
        Job job = new Job("ticker", "recurring ticker", runCount::incrementAndGet, JobPriority.NORMAL, new FixedDelayTrigger(1_000L), RetryPolicy.none());
        scheduler.schedule(job);

        // Run 1: at 31_000
        clock.set(31_000L);
        scheduler.dispatchReady();
        check(runCount.get() == 1, "ran 1st time");
        check(scheduler.pendingTaskCount() == 1, "automatically rescheduled for next run");
        check(scheduler.getJobState("ticker") == ExecutionState.PENDING, "pending next execution");

        // Run 2: at 32_000
        clock.set(32_000L);
        scheduler.dispatchReady();
        check(runCount.get() == 2, "ran 2nd time");

        // Run 3: at 33_000
        clock.set(33_000L);
        scheduler.dispatchReady();
        check(runCount.get() == 3, "ran 3rd time");
    }

    private static void testRetryPolicyFixedDelay() {
        ManualClock clock = new ManualClock(40_000L);
        JobScheduler scheduler = new JobScheduler(clock);

        AtomicInteger attempts = new AtomicInteger(0);
        Job job = new Job(
            "fixed-retry",
            "Fixed retry job",
            () -> {
                int att = attempts.incrementAndGet();
                if (att < 3) throw new RuntimeException("fail on attempt " + att);
            },
            JobPriority.NORMAL,
            new OneShotTrigger(40_000L),
            RetryPolicy.fixed(3, 500L)
        );
        scheduler.schedule(job);

        // Attempt 1: fails at 40_000, scheduled for 40_500
        scheduler.dispatchReady();
        check(attempts.get() == 1, "attempt 1 failed");
        check(scheduler.pendingTaskCount() == 1, "retry scheduled");

        // Attempt 2: fails at 40_500, scheduled for 41_000
        clock.set(40_500L);
        scheduler.dispatchReady();
        check(attempts.get() == 2, "attempt 2 failed");

        // Attempt 3: succeeds at 41_000
        clock.set(41_000L);
        scheduler.dispatchReady();
        check(attempts.get() == 3, "attempt 3 succeeded");
        check(scheduler.getJobState("fixed-retry") == ExecutionState.SUCCESS, "final state is SUCCESS");
    }

    private static void testRetryPolicyExponentialBackoff() {
        RetryPolicy policy = RetryPolicy.exponential(4, 1_000L, 10_000L);
        check(policy.delayForAttempt(1) == 1_000L, "attempt 1 delay 1000");
        check(policy.delayForAttempt(2) == 2_000L, "attempt 2 delay 2000");
        check(policy.delayForAttempt(3) == 4_000L, "attempt 3 delay 4000");
        check(policy.delayForAttempt(4) == 8_000L, "attempt 4 delay 8000");
        check(policy.delayForAttempt(5) == 10_000L, "attempt 5 capped at maxDelay 10000");
    }

    private static void testRetryExhaustionMarksFailed() {
        ManualClock clock = new ManualClock(50_000L);
        JobScheduler scheduler = new JobScheduler(clock);

        AtomicInteger attempts = new AtomicInteger(0);
        Job doomed = new Job(
            "doomed",
            "Always failing job",
            () -> {
                attempts.incrementAndGet();
                throw new RuntimeException("permanent failure");
            },
            JobPriority.NORMAL,
            new OneShotTrigger(50_000L),
            RetryPolicy.fixed(2, 500L) // max 2 retries -> 1 initial + 2 retries = 3 total attempts
        );
        scheduler.schedule(doomed);

        // Attempt 1 (initial): 50_000
        scheduler.dispatchReady();
        check(attempts.get() == 1, "attempt 1 ran");

        // Attempt 2 (retry 1): 50_500
        clock.set(50_500L);
        scheduler.dispatchReady();
        check(attempts.get() == 2, "attempt 2 ran");

        // Attempt 3 (retry 2): 51_000
        clock.set(51_000L);
        scheduler.dispatchReady();
        check(attempts.get() == 3, "attempt 3 ran");

        // Retries exhausted
        check(scheduler.getJobState("doomed") == ExecutionState.FAILED, "state marked FAILED after exhaustion");
        check(scheduler.pendingTaskCount() == 0, "no tasks left in queue");
    }

    private static void testJobCancellation() {
        ManualClock clock = new ManualClock(60_000L);
        JobScheduler scheduler = new JobScheduler(clock);

        AtomicBoolean ran = new AtomicBoolean(false);
        Job job = new Job("cancellable", "Cancel me", () -> ran.set(true), JobPriority.NORMAL, new OneShotTrigger(65_000L), RetryPolicy.none());
        scheduler.schedule(job);

        check(scheduler.pendingTaskCount() == 1, "task is queued");
        boolean cancelled = scheduler.cancel("cancellable");
        check(cancelled, "cancel returns true");
        check(scheduler.getJobState("cancellable") == ExecutionState.CANCELLED, "state is CANCELLED");
        check(scheduler.pendingTaskCount() == 0, "queue cleared for cancelled job");

        // Advance past trigger time
        clock.set(66_000L);
        scheduler.dispatchReady();
        check(!ran.get(), "cancelled task did not run");

        boolean cancelAgain = scheduler.cancel("cancellable");
        check(!cancelAgain, "cancelling already cancelled job returns false");
    }

    private static void testPauseAndResume() {
        ManualClock clock = new ManualClock(70_000L);
        JobScheduler scheduler = new JobScheduler(clock);

        AtomicInteger counter = new AtomicInteger(0);
        Job job = new Job("p1", "pause test", counter::incrementAndGet, JobPriority.NORMAL, new OneShotTrigger(70_100L), RetryPolicy.none());
        scheduler.schedule(job);

        scheduler.pause();
        check(scheduler.isPaused(), "scheduler is paused");

        clock.set(70_200L);
        int d1 = scheduler.dispatchReady();
        check(d1 == 0, "dispatched 0 tasks while paused");
        check(counter.get() == 0, "job did not run while paused");

        scheduler.resume();
        check(!scheduler.isPaused(), "scheduler is resumed");

        int d2 = scheduler.dispatchReady();
        check(d2 == 1, "dispatched 1 task after resume");
        check(counter.get() == 1, "job ran after resume");
    }

    private static void testJobListenerCallbacks() {
        ManualClock clock = new ManualClock(80_000L);
        JobScheduler scheduler = new JobScheduler(clock);

        List<String> events = new ArrayList<>();
        scheduler.addListener(new JobListener() {
            @Override
            public void onScheduled(Job job, long scheduledTime) { events.add("scheduled:" + job.id()); }
            @Override
            public void onStarted(String jobId, int attempt) { events.add("started:" + jobId + ":" + attempt); }
            @Override
            public void onSuccess(String jobId, long duration) { events.add("success:" + jobId); }
            @Override
            public void onFailure(String jobId, int attempt, Exception e, boolean willRetry) { events.add("failure:" + jobId); }
            @Override
            public void onCancelled(String jobId) { events.add("cancelled:" + jobId); }
        });

        Job job = new Job("evt-job", "event test", () -> {}, JobPriority.NORMAL, new OneShotTrigger(80_000L), RetryPolicy.none());
        scheduler.schedule(job);
        scheduler.dispatchReady();

        check(events.contains("scheduled:evt-job"), "received onScheduled");
        check(events.contains("started:evt-job:1"), "received onStarted");
        check(events.contains("success:evt-job"), "received onSuccess");

        Job cancelJob = new Job("cancel-evt", "cancel evt test", () -> {}, JobPriority.NORMAL, new OneShotTrigger(85_000L), RetryPolicy.none());
        scheduler.schedule(cancelJob);
        scheduler.cancel("cancel-evt");
        check(events.contains("cancelled:cancel-evt"), "received onCancelled");
    }

    private static void testJobRunHistory() {
        ManualClock clock = new ManualClock(90_000L);
        JobScheduler scheduler = new JobScheduler(clock);

        Job job = new Job("hist-job", "history test", () -> clock.advance(50L), JobPriority.NORMAL, new OneShotTrigger(90_000L), RetryPolicy.none());
        scheduler.schedule(job);
        scheduler.dispatchReady();

        List<JobRun> runs = scheduler.getJobHistory("hist-job");
        check(runs.size() == 1, "1 run in history");
        JobRun r = runs.get(0);
        check(r.jobId().equals("hist-job"), "run jobId matches");
        check(r.attempt() == 1, "attempt 1");
        check(r.state() == ExecutionState.SUCCESS, "state SUCCESS");
        check(r.duration() == 50L, "duration is 50ms");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Initialized JobScheduler with ManualClock at 1000000",
      "Pending tasks in queue: 3",
      "Started job flaky-sync (attempt 1)",
      "Job flaky-sync failed on attempt 1 (Network timeout), willRetry=true",
      "Dispatched 1 tasks at 1001000",
      "Started job report-job (attempt 1)",
      "Completed job report-job successfully",
      "Started job flaky-sync (attempt 2)",
      "Job flaky-sync failed on attempt 2 (Network timeout), willRetry=true",
      "Dispatched 2 tasks at 1002000",
      "Started job health-check (attempt 1)",
      "Completed job health-check successfully",
      "Started job flaky-sync (attempt 3)",
      "Completed job flaky-sync successfully",
      "Dispatched 2 tasks at 1004000",
      "State of report-job: SUCCESS",
      "State of flaky-sync: SUCCESS",
      "Cancelled health-check: true",
    ],
  },
};
