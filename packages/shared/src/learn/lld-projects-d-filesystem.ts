import type { LldProject } from "./types";

// In-memory file system (plan 0025). Java 17, standard library only, default package.
// Compiled with javac -Xlint:all and run (Main and Tests) when it was written.

export const LLD_PROJECTS_D_FILESYSTEM: Record<string, LldProject> = {
  "lldp-file-system-kv": {
    files: [
      {
        name: "TimeSource.java",
        code: `interface TimeSource {
    long nowMillis();
}
`,
      },
      {
        name: "ManualClock.java",
        code: `final class ManualClock implements TimeSource {
    private long now;

    ManualClock(long start) { this.now = start; }

    @Override
    public synchronized long nowMillis() { return now; }

    synchronized void advance(long millis) { now += millis; }
}
`,
      },
      {
        name: "User.java",
        code: `import java.util.Set;

// Who is asking. The super user (root) is allowed everything; everybody else is checked against owner, group and others.
record User(String name, Set<String> groups) {
    static final User ROOT = new User("root", Set.of("root"));

    static User of(String name, String... groups) { return new User(name, Set.of(groups)); }

    boolean isRoot() { return name.equals("root"); }
}
`,
      },
      {
        name: "FsCode.java",
        code: `enum FsCode {
    OK, NOT_FOUND, ALREADY_EXISTS, NOT_A_DIRECTORY, IS_A_DIRECTORY, PERMISSION_DENIED, NOT_EMPTY, INVALID_PATH,
    QUOTA_EXCEEDED, TOO_MANY_LINKS, MOVE_INTO_ITSELF, CANNOT_REMOVE_ROOT
}
`,
      },
      {
        name: "Result.java",
        code: `// What every file system call returns: a code, and a value when the code is OK.
record Result<T>(FsCode code, T value) {
    static <T> Result<T> ok(T value) { return new Result<>(FsCode.OK, value); }

    static <T> Result<T> fail(FsCode code) { return new Result<>(code, null); }

    boolean ok() { return code == FsCode.OK; }
}
`,
      },
      {
        name: "Mode.java",
        code: `// Unix style permission bits: three digits for owner, group and others, each made of read (4), write (2) and execute (1).
// 0755 means the owner may do everything, everybody else may read and enter. On a directory, "execute" means
// "may pass through it", read means "may list it", write means "may add or remove entries".
final class Mode {
    static final int READ = 4;
    static final int WRITE = 2;
    static final int EXECUTE = 1;

    private Mode() { }

    static boolean allows(User who, Node node, int wanted) {
        if (who.isRoot()) return true;
        int shift = who.name().equals(node.owner) ? 6 : (who.groups().contains(node.group) ? 3 : 0);
        return ((node.mode >> shift) & wanted) == wanted;
    }

    // "rwxr-xr-x" for 0755
    static String text(int mode) {
        StringBuilder sb = new StringBuilder();
        for (int shift = 6; shift >= 0; shift -= 3) {
            int bits = (mode >> shift) & 7;
            sb.append((bits & READ) != 0 ? 'r' : '-').append((bits & WRITE) != 0 ? 'w' : '-').append((bits & EXECUTE) != 0 ? 'x' : '-');
        }
        return sb.toString();
    }
}
`,
      },
      {
        name: "Node.java",
        code: `// The Composite pattern: files, directories and links are all Nodes, so code that walks a path or a tree treats them alike
// and asks a node what it is only when it has to.
abstract class Node {
    String name;
    DirNode parent;
    String owner;
    String group;
    int mode;
    long modifiedAt;

    Node(String name, String owner, String group, int mode, long now) {
        this.name = name;
        this.owner = owner;
        this.group = group;
        this.mode = mode;
        this.modifiedAt = now;
    }

    abstract long size();

    abstract String kind();

    abstract void accept(NodeVisitor visitor, String path);
}
`,
      },
      {
        name: "FileNode.java",
        code: `import java.nio.charset.StandardCharsets;

final class FileNode extends Node {
    private String content = "";
    private long bytes;

    FileNode(String name, String owner, String group, int mode, long now) { super(name, owner, group, mode, now); }

    String content() { return content; }

    void setContent(String text, long now) {
        content = text;
        bytes = text.getBytes(StandardCharsets.UTF_8).length;
        modifiedAt = now;
    }

    @Override
    long size() { return bytes; }

    @Override
    String kind() { return "file"; }

    @Override
    void accept(NodeVisitor v, String path) { v.visitFile(this, path); }
}
`,
      },
      {
        name: "DirNode.java",
        code: `import java.util.Map;
import java.util.TreeMap;

final class DirNode extends Node {
    private final Map<String, Node> children = new TreeMap<>();

    DirNode(String name, String owner, String group, int mode, long now) { super(name, owner, group, mode, now); }

    Node child(String childName) { return children.get(childName); }

    Iterable<Node> children() { return children.values(); }

    boolean isEmpty() { return children.isEmpty(); }

    void add(Node node, long now) {
        children.put(node.name, node);
        node.parent = this;
        modifiedAt = now;
    }

    void remove(Node node, long now) {
        children.remove(node.name);
        node.parent = null;
        modifiedAt = now;
    }

    // Total size of everything below, computed when asked. Caching it would need updating every ancestor on every write.
    @Override
    long size() {
        long sum = 0;
        for (Node n : children.values()) sum += n.size();
        return sum;
    }

    @Override
    String kind() { return "dir"; }

    @Override
    void accept(NodeVisitor v, String path) {
        v.visitDirectory(this, path);
        for (Node n : children.values()) n.accept(v, path.equals("/") ? "/" + n.name : path + "/" + n.name);
    }
}
`,
      },
      {
        name: "LinkNode.java",
        code: `// A symbolic link: a node that holds a path. Following it is the file system's job, with a limit on the number of hops
// so that a link that points at itself cannot loop for ever.
final class LinkNode extends Node {
    final String target;

    LinkNode(String name, String target, String owner, long now) {
        super(name, owner, "root", 0777, now);
        this.target = target;
    }

    @Override
    long size() { return target.length(); }

    @Override
    String kind() { return "link"; }

    @Override
    void accept(NodeVisitor v, String path) { v.visitLink(this, path); }
}
`,
      },
      {
        name: "NodeVisitor.java",
        code: `// The Visitor pattern: a new walk over the tree (disk usage, find, a listing, a copy) is a new visitor, and the node
// classes do not change.
interface NodeVisitor {
    void visitFile(FileNode file, String path);

    void visitDirectory(DirNode dir, String path);

    void visitLink(LinkNode link, String path);
}
`,
      },
      {
        name: "Stat.java",
        code: `record Stat(String kind, long size, String owner, String group, String permissions, long modifiedAt) { }
`,
      },
      {
        name: "Glob.java",
        code: `// A tiny wildcard matcher for find: * matches any run of characters and ? matches one.
final class Glob {
    private Glob() { }

    static boolean matches(String pattern, String text) {
        return matches(pattern, 0, text, 0);
    }

    private static boolean matches(String p, int pi, String t, int ti) {
        if (pi == p.length()) return ti == t.length();
        char c = p.charAt(pi);
        if (c == '*') {
            for (int skip = ti; skip <= t.length(); skip++) {
                if (matches(p, pi + 1, t, skip)) return true;
            }
            return false;
        }
        if (ti == t.length()) return false;
        return (c == '?' || c == t.charAt(ti)) && matches(p, pi + 1, t, ti + 1);
    }
}
`,
      },
      {
        name: "FileSystem.java",
        code: `import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

// An in-memory file system with Unix-like rules: paths with . and .., permissions checked on every step, symbolic links,
// and a byte quota per owner. Reading calls (read, ls, stat, find, du, tree) take the shared lock and run in parallel;
// calls that change the tree take the exclusive lock. One lock for the whole tree is simple and correct; the walkthrough
// says what a finer lock would need.
final class FileSystem {
    static final int MAX_LINK_HOPS = 8;

    private final DirNode root;
    private final TimeSource clock;
    private final ReadWriteLock lock = new ReentrantReadWriteLock();
    private final Map<String, Long> quotas = new HashMap<>();
    private final Map<String, Long> usage = new HashMap<>();

    FileSystem(TimeSource clock) {
        this.clock = clock;
        this.root = new DirNode("", "root", "root", 0755, clock.nowMillis());
    }

    void setQuota(String owner, long bytes) {
        lock.writeLock().lock();
        try {
            quotas.put(owner, bytes);
        } finally {
            lock.writeLock().unlock();
        }
    }

    long usageOf(String owner) {
        lock.readLock().lock();
        try {
            return usage.getOrDefault(owner, 0L);
        } finally {
            lock.readLock().unlock();
        }
    }

    // ---------------------------------------------------------------- path walking

    private static List<String> split(String path) {
        if (path == null || !path.startsWith("/")) return null;
        List<String> parts = new ArrayList<>();
        for (String part : path.split("/")) {
            if (!part.isEmpty()) parts.add(part);
        }
        return parts;
    }

    // Walks the parts from a directory. Every directory passed through needs the execute permission. A link met on
    // the way is followed (and always followed at the end when followLast is true).
    private Result<Node> walk(User who, DirNode start, List<String> parts, boolean followLast, int hops) {
        Node current = start;
        for (int i = 0; i < parts.size(); i++) {
            String part = parts.get(i);
            if (!(current instanceof DirNode dir)) return Result.fail(FsCode.NOT_A_DIRECTORY);
            if (!Mode.allows(who, dir, Mode.EXECUTE)) return Result.fail(FsCode.PERMISSION_DENIED);
            if (part.equals(".")) continue;
            if (part.equals("..")) {
                current = dir.parent == null ? dir : dir.parent;
                continue;
            }
            Node next = dir.child(part);
            if (next == null) return Result.fail(FsCode.NOT_FOUND);
            boolean last = i == parts.size() - 1;
            if (next instanceof LinkNode link && (!last || followLast)) {
                if (hops >= MAX_LINK_HOPS) return Result.fail(FsCode.TOO_MANY_LINKS);
                List<String> targetParts = split(link.target);
                DirNode from = link.target.startsWith("/") ? root : dir;
                Result<Node> resolved = walk(who, from, targetParts == null ? List.of(link.target.split("/")) : targetParts, true, hops + 1);
                if (!resolved.ok()) return resolved;
                next = resolved.value();
            }
            current = next;
        }
        return Result.ok(current);
    }

    private Result<Node> find(User who, String path, boolean followLast) {
        List<String> parts = split(path);
        if (parts == null) return Result.fail(FsCode.INVALID_PATH);
        return walk(who, root, parts, followLast, 0);
    }

    // The directory that holds the last part of the path, and that last part's name. The parent must be a directory.
    private record Parent(DirNode dir, String name) { }

    private Result<Parent> parentOf(User who, String path) {
        List<String> parts = split(path);
        if (parts == null || parts.isEmpty()) return Result.fail(parts == null ? FsCode.INVALID_PATH : FsCode.CANNOT_REMOVE_ROOT);
        String last = parts.get(parts.size() - 1);
        if (last.equals(".") || last.equals("..")) return Result.fail(FsCode.INVALID_PATH);
        Result<Node> parent = walk(who, root, parts.subList(0, parts.size() - 1), true, 0);
        if (!parent.ok()) return Result.fail(parent.code());
        if (!(parent.value() instanceof DirNode dir)) return Result.fail(FsCode.NOT_A_DIRECTORY);
        if (!Mode.allows(who, dir, Mode.EXECUTE)) return Result.fail(FsCode.PERMISSION_DENIED);
        return Result.ok(new Parent(dir, last));
    }

    // ---------------------------------------------------------------- changing the tree

    Result<Void> mkdir(User who, String path, boolean parents) {
        lock.writeLock().lock();
        try {
            List<String> parts = split(path);
            if (parts == null) return Result.fail(FsCode.INVALID_PATH);
            if (parts.isEmpty()) return parents ? Result.ok(null) : Result.fail(FsCode.ALREADY_EXISTS);
            DirNode dir = root;
            for (int i = 0; i < parts.size(); i++) {
                String part = parts.get(i);
                if (part.equals(".") || part.equals("..")) return Result.fail(FsCode.INVALID_PATH);
                if (!Mode.allows(who, dir, Mode.EXECUTE)) return Result.fail(FsCode.PERMISSION_DENIED);
                Node child = dir.child(part);
                boolean last = i == parts.size() - 1;
                if (child == null) {
                    if (!last && !parents) return Result.fail(FsCode.NOT_FOUND);
                    if (!Mode.allows(who, dir, Mode.WRITE)) return Result.fail(FsCode.PERMISSION_DENIED);
                    child = new DirNode(part, who.name(), primaryGroup(who), 0755, clock.nowMillis());
                    dir.add(child, clock.nowMillis());
                } else if (last && !parents) {
                    return Result.fail(FsCode.ALREADY_EXISTS);
                }
                if (!(child instanceof DirNode next)) return Result.fail(FsCode.NOT_A_DIRECTORY);
                dir = next;
            }
            return Result.ok(null);
        } finally {
            lock.writeLock().unlock();
        }
    }

    private static String primaryGroup(User who) {
        return who.groups().stream().sorted().findFirst().orElse(who.name());
    }

    // Writes text to a file, creating it if the folder allows. append adds to the end instead of replacing.
    Result<Void> write(User who, String path, String text, boolean append) {
        lock.writeLock().lock();
        try {
            Result<Parent> p = parentOf(who, path);
            if (!p.ok()) return Result.fail(p.code());
            Node existing = p.value().dir().child(p.value().name());
            if (existing instanceof LinkNode) {
                Result<Node> followed = find(who, path, true);
                if (!followed.ok()) return Result.fail(followed.code());
                existing = followed.value();
            }
            if (existing instanceof DirNode) return Result.fail(FsCode.IS_A_DIRECTORY);
            FileNode file;
            if (existing == null) {
                if (!Mode.allows(who, p.value().dir(), Mode.WRITE)) return Result.fail(FsCode.PERMISSION_DENIED);
                file = new FileNode(p.value().name(), who.name(), primaryGroup(who), 0644, clock.nowMillis());
            } else {
                file = (FileNode) existing;
                if (!Mode.allows(who, file, Mode.WRITE)) return Result.fail(FsCode.PERMISSION_DENIED);
            }
            String next = append ? file.content() + text : text;
            long delta = next.getBytes(java.nio.charset.StandardCharsets.UTF_8).length - file.size();
            if (!fits(file.owner, delta)) return Result.fail(FsCode.QUOTA_EXCEEDED);
            if (existing == null) p.value().dir().add(file, clock.nowMillis());
            file.setContent(next, clock.nowMillis());
            usage.merge(file.owner, delta, Long::sum);
            return Result.ok(null);
        } finally {
            lock.writeLock().unlock();
        }
    }

    private boolean fits(String owner, long delta) {
        Long quota = quotas.get(owner);
        return quota == null || usage.getOrDefault(owner, 0L) + delta <= quota;
    }

    Result<Void> symlink(User who, String target, String linkPath) {
        lock.writeLock().lock();
        try {
            Result<Parent> p = parentOf(who, linkPath);
            if (!p.ok()) return Result.fail(p.code());
            if (p.value().dir().child(p.value().name()) != null) return Result.fail(FsCode.ALREADY_EXISTS);
            if (!Mode.allows(who, p.value().dir(), Mode.WRITE)) return Result.fail(FsCode.PERMISSION_DENIED);
            p.value().dir().add(new LinkNode(p.value().name(), target, who.name(), clock.nowMillis()), clock.nowMillis());
            return Result.ok(null);
        } finally {
            lock.writeLock().unlock();
        }
    }

    Result<Void> rm(User who, String path, boolean recursive) {
        lock.writeLock().lock();
        try {
            Result<Parent> p = parentOf(who, path);
            if (!p.ok()) return Result.fail(p.code());
            Node node = p.value().dir().child(p.value().name());
            if (node == null) return Result.fail(FsCode.NOT_FOUND);
            if (!Mode.allows(who, p.value().dir(), Mode.WRITE)) return Result.fail(FsCode.PERMISSION_DENIED);
            if (node instanceof DirNode dir) {
                if (!dir.isEmpty() && !recursive) return Result.fail(FsCode.NOT_EMPTY);
                if (!canRemoveTree(who, dir)) return Result.fail(FsCode.PERMISSION_DENIED);
            }
            release(node);
            p.value().dir().remove(node, clock.nowMillis());
            return Result.ok(null);
        } finally {
            lock.writeLock().unlock();
        }
    }

    // Emptying a directory removes entries from it and from everything below, so each of them needs write and execute.
    private boolean canRemoveTree(User who, DirNode dir) {
        if (!Mode.allows(who, dir, Mode.WRITE | Mode.EXECUTE)) return false;
        for (Node n : dir.children()) {
            if (n instanceof DirNode sub && !canRemoveTree(who, sub)) return false;
        }
        return true;
    }

    // Gives the bytes of a removed subtree back to their owners' quotas.
    private void release(Node node) {
        node.accept(new NodeVisitor() {
            @Override
            public void visitFile(FileNode file, String path) { usage.merge(file.owner, -file.size(), Long::sum); }

            @Override
            public void visitDirectory(DirNode dir, String path) { }

            @Override
            public void visitLink(LinkNode link, String path) { }
        }, "/");
    }

    // Moves or renames. When the destination is an existing directory, the node goes inside it under its own name.
    Result<Void> mv(User who, String from, String to) {
        lock.writeLock().lock();
        try {
            Result<Parent> source = parentOf(who, from);
            if (!source.ok()) return Result.fail(source.code());
            Node node = source.value().dir().child(source.value().name());
            if (node == null) return Result.fail(FsCode.NOT_FOUND);

            Result<Node> existing = find(who, to, true);
            DirNode targetDir;
            String targetName;
            if (existing.ok() && existing.value() instanceof DirNode dir) {
                targetDir = dir;
                targetName = node.name;
            } else {
                Result<Parent> dest = parentOf(who, to);
                if (!dest.ok()) return Result.fail(dest.code());
                targetDir = dest.value().dir();
                targetName = dest.value().name();
            }
            if (targetDir.child(targetName) != null) return Result.fail(FsCode.ALREADY_EXISTS);
            for (DirNode up = targetDir; up != null; up = up.parent) {
                if (up == node) return Result.fail(FsCode.MOVE_INTO_ITSELF);
            }
            if (!Mode.allows(who, source.value().dir(), Mode.WRITE) || !Mode.allows(who, targetDir, Mode.WRITE)) return Result.fail(FsCode.PERMISSION_DENIED);
            source.value().dir().remove(node, clock.nowMillis());
            node.name = targetName;
            targetDir.add(node, clock.nowMillis());
            return Result.ok(null);
        } finally {
            lock.writeLock().unlock();
        }
    }

    // Copies a file, or a whole directory when recursive. The copies belong to the user who copied, so they count
    // against that user's quota. If the quota runs out half way, nothing is left behind.
    Result<Void> cp(User who, String from, String to, boolean recursive) {
        lock.writeLock().lock();
        try {
            Result<Node> source = find(who, from, true);
            if (!source.ok()) return Result.fail(source.code());
            if (source.value() instanceof DirNode && !recursive) return Result.fail(FsCode.IS_A_DIRECTORY);
            if (!canReadTree(who, source.value())) return Result.fail(FsCode.PERMISSION_DENIED);

            Result<Parent> dest = parentOf(who, to);
            if (!dest.ok()) return Result.fail(dest.code());
            DirNode dir = dest.value().dir();
            if (dir.child(dest.value().name()) != null) return Result.fail(FsCode.ALREADY_EXISTS);
            if (!Mode.allows(who, dir, Mode.WRITE)) return Result.fail(FsCode.PERMISSION_DENIED);
            for (DirNode up = dir; up != null; up = up.parent) {
                if (up == source.value()) return Result.fail(FsCode.MOVE_INTO_ITSELF);
            }
            Node copy = duplicate(who, source.value(), dest.value().name());
            long added = copy.size();
            if (!fits(who.name(), added)) return Result.fail(FsCode.QUOTA_EXCEEDED);
            usage.merge(who.name(), added, Long::sum);
            dir.add(copy, clock.nowMillis());
            return Result.ok(null);
        } finally {
            lock.writeLock().unlock();
        }
    }

    private boolean canReadTree(User who, Node node) {
        if (node instanceof FileNode) return Mode.allows(who, node, Mode.READ);
        if (node instanceof DirNode dir) {
            if (!Mode.allows(who, dir, Mode.READ | Mode.EXECUTE)) return false;
            for (Node child : dir.children()) if (!canReadTree(who, child)) return false;
        }
        return true;
    }

    private Node duplicate(User who, Node node, String name) {
        long now = clock.nowMillis();
        if (node instanceof FileNode file) {
            FileNode copy = new FileNode(name, who.name(), primaryGroup(who), file.mode, now);
            copy.setContent(file.content(), now);
            return copy;
        }
        if (node instanceof LinkNode link) return new LinkNode(name, link.target, who.name(), now);
        DirNode dir = (DirNode) node;
        DirNode copy = new DirNode(name, who.name(), primaryGroup(who), dir.mode, now);
        for (Node child : dir.children()) copy.add(duplicate(who, child, child.name), now);
        return copy;
    }

    Result<Void> chmod(User who, String path, int mode) {
        lock.writeLock().lock();
        try {
            Result<Node> n = find(who, path, true);
            if (!n.ok()) return Result.fail(n.code());
            if (!who.isRoot() && !who.name().equals(n.value().owner)) return Result.fail(FsCode.PERMISSION_DENIED);
            n.value().mode = mode & 0777;
            return Result.ok(null);
        } finally {
            lock.writeLock().unlock();
        }
    }

    Result<Void> chown(User who, String path, String owner, String group) {
        lock.writeLock().lock();
        try {
            if (!who.isRoot()) return Result.fail(FsCode.PERMISSION_DENIED);
            Result<Node> n = find(who, path, true);
            if (!n.ok()) return Result.fail(n.code());
            if (n.value() instanceof FileNode file) {
                usage.merge(file.owner, -file.size(), Long::sum);
                usage.merge(owner, file.size(), Long::sum);
            }
            n.value().owner = owner;
            n.value().group = group;
            return Result.ok(null);
        } finally {
            lock.writeLock().unlock();
        }
    }

    // ---------------------------------------------------------------- reading

    Result<String> read(User who, String path) {
        lock.readLock().lock();
        try {
            Result<Node> n = find(who, path, true);
            if (!n.ok()) return Result.fail(n.code());
            if (n.value() instanceof DirNode) return Result.fail(FsCode.IS_A_DIRECTORY);
            if (!Mode.allows(who, n.value(), Mode.READ)) return Result.fail(FsCode.PERMISSION_DENIED);
            return Result.ok(((FileNode) n.value()).content());
        } finally {
            lock.readLock().unlock();
        }
    }

    // A directory lists its entries by name; a file lists itself.
    Result<List<String>> ls(User who, String path) {
        lock.readLock().lock();
        try {
            Result<Node> n = find(who, path, true);
            if (!n.ok()) return Result.fail(n.code());
            if (!(n.value() instanceof DirNode dir)) return Result.ok(List.of(n.value().name));
            if (!Mode.allows(who, dir, Mode.READ)) return Result.fail(FsCode.PERMISSION_DENIED);
            List<String> names = new ArrayList<>();
            for (Node child : dir.children()) names.add(child.name);
            return Result.ok(names);
        } finally {
            lock.readLock().unlock();
        }
    }

    Result<Stat> stat(User who, String path) {
        lock.readLock().lock();
        try {
            Result<Node> n = find(who, path, false);
            if (!n.ok()) return Result.fail(n.code());
            Node node = n.value();
            return Result.ok(new Stat(node.kind(), node.size(), node.owner, node.group, Mode.text(node.mode), node.modifiedAt));
        } finally {
            lock.readLock().unlock();
        }
    }

    // Total bytes of everything below a path, counting only what the user is allowed to see.
    Result<Long> du(User who, String path) {
        lock.readLock().lock();
        try {
            Result<Node> n = find(who, path, true);
            if (!n.ok()) return Result.fail(n.code());
            long[] total = {0};
            n.value().accept(new NodeVisitor() {
                @Override
                public void visitFile(FileNode file, String p) { total[0] += file.size(); }

                @Override
                public void visitDirectory(DirNode dir, String p) { }

                @Override
                public void visitLink(LinkNode link, String p) { }
            }, path);
            return Result.ok(total[0]);
        } finally {
            lock.readLock().unlock();
        }
    }

    // All paths below start whose last name matches the pattern, in path order.
    Result<List<String>> find(User who, String start, String pattern) {
        lock.readLock().lock();
        try {
            Result<Node> n = find(who, start, true);
            if (!n.ok()) return Result.fail(n.code());
            List<String> found = new ArrayList<>();
            String base = start.equals("/") ? "/" : start.replaceAll("/+$", "");
            n.value().accept(new NodeVisitor() {
                private void consider(Node node, String path) {
                    if (Glob.matches(pattern, node.name)) found.add(path);
                }

                @Override
                public void visitFile(FileNode file, String path) { consider(file, path); }

                @Override
                public void visitDirectory(DirNode dir, String path) { consider(dir, path); }

                @Override
                public void visitLink(LinkNode link, String path) { consider(link, path); }
            }, base.isEmpty() ? "/" : base);
            return Result.ok(found);
        } finally {
            lock.readLock().unlock();
        }
    }

    // An indented picture of the tree, like the tree command.
    Result<String> tree(User who, String path) {
        lock.readLock().lock();
        try {
            Result<Node> n = find(who, path, true);
            if (!n.ok()) return Result.fail(n.code());
            StringBuilder sb = new StringBuilder();
            draw(n.value(), "", sb);
            return Result.ok(sb.toString());
        } finally {
            lock.readLock().unlock();
        }
    }

    private void draw(Node node, String indent, StringBuilder sb) {
        sb.append(indent).append(node.name.isEmpty() ? "/" : node.name).append(node instanceof DirNode ? "/" : "").append('\\n');
        if (node instanceof DirNode dir) for (Node child : dir.children()) draw(child, indent + "  ", sb);
    }
}
`,
      },
      {
        name: "Main.java",
        code: `import java.util.List;

public class Main {
    public static void main(String[] args) {
        ManualClock clock = new ManualClock(1_000);
        FileSystem fs = new FileSystem(clock);
        User root = User.ROOT;
        User asha = User.of("asha", "staff");
        User ben = User.of("ben", "staff");
        User chen = User.of("chen", "guests");

        fs.mkdir(root, "/home", false);
        fs.mkdir(root, "/home/asha", false);
        fs.chown(root, "/home/asha", "asha", "staff");
        fs.mkdir(root, "/home/ben", false);
        fs.chown(root, "/home/ben", "ben", "staff");
        System.out.println("mkdir /a/b/c without -p: " + fs.mkdir(asha, "/home/asha/a/b/c", false).code());
        System.out.println("mkdir -p: " + fs.mkdir(asha, "/home/asha/a/b/c", true).code() + ", again: " + fs.mkdir(asha, "/home/asha/a/b/c", false).code());
        System.out.println("Ben writes into Asha's folder: " + fs.write(ben, "/home/asha/hello.txt", "hi", false).code());

        fs.write(asha, "/home/asha/a/notes.txt", "line one\\n", false);
        fs.write(asha, "/home/asha/a/notes.txt", "line two\\n", true);
        System.out.println("notes.txt: " + fs.read(asha, "/home/asha/a/notes.txt").value().replace("\\n", "|"));
        System.out.println("Dot segments: " + fs.read(asha, "/home/asha/a/b/../../a/./notes.txt").code());
        System.out.println("ls /home/asha/a: " + fs.ls(asha, "/home/asha/a").value());
        System.out.println("stat: " + fs.stat(asha, "/home/asha/a/notes.txt").value());

        fs.chmod(asha, "/home/asha/a/notes.txt", 0640);
        System.out.println("Ben (same group) reads: " + fs.read(ben, "/home/asha/a/notes.txt").code() + ", Chen reads: " + fs.read(chen, "/home/asha/a/notes.txt").code());
        fs.chmod(asha, "/home/asha", 0700);
        System.out.println("After chmod 700 on the folder, Ben reads: " + fs.read(ben, "/home/asha/a/notes.txt").code());
        fs.chmod(asha, "/home/asha", 0755);

        fs.symlink(asha, "/home/asha/a", "/home/asha/shortcut");
        System.out.println("Through a link: " + fs.read(asha, "/home/asha/shortcut/notes.txt").code());
        fs.symlink(asha, "/home/asha/loop2", "/home/asha/loop1");
        fs.symlink(asha, "/home/asha/loop1", "/home/asha/loop2");
        System.out.println("A link loop: " + fs.read(asha, "/home/asha/loop1").code());

        System.out.println("cp -r: " + fs.cp(ben, "/home/asha/a", "/home/ben/copy", true).code() + ", du of the copy: " + fs.du(ben, "/home/ben/copy").value() + " bytes");
        System.out.println("find *.txt: " + fs.find(root, "/home", "*.txt").value());
        System.out.println("mv into its own subtree: " + fs.mv(asha, "/home/asha/a", "/home/asha/a/b").code());
        System.out.println("mv into a folder: " + fs.mv(asha, "/home/asha/a/notes.txt", "/home/asha/a/b").code() + ", " + fs.ls(asha, "/home/asha/a/b").value());
        System.out.println("rm non-empty folder: " + fs.rm(asha, "/home/asha/a", false).code() + ", with -r: " + fs.rm(asha, "/home/asha/a", true).code());

        fs.setQuota("ben", 100);
        System.out.println("Quota: " + fs.write(ben, "/home/ben/big.txt", "x".repeat(60), false).code() + ", then " + fs.write(ben, "/home/ben/big2.txt", "y".repeat(60), false).code() + ", used " + fs.usageOf("ben"));
        System.out.print(fs.tree(root, "/home").value());
        System.out.println("Paths: " + List.of(fs.read(asha, "home").code(), fs.rm(root, "/", true).code()));
    }
}
`,
      },
    ],
    tests: [
      {
        name: "Tests.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

public class Tests {
    private static int failures = 0;

    private static void check(boolean ok, String name) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    private static final User ROOT = User.ROOT;
    private static final User ASHA = User.of("asha", "staff");
    private static final User BEN = User.of("ben", "staff");
    private static final User CHEN = User.of("chen", "guests");

    private static FileSystem fresh() {
        FileSystem fs = new FileSystem(new ManualClock(0));
        fs.mkdir(ROOT, "/home", false);
        fs.mkdir(ROOT, "/home/asha", false);
        fs.chown(ROOT, "/home/asha", "asha", "staff");
        fs.mkdir(ROOT, "/home/ben", false);
        fs.chown(ROOT, "/home/ben", "ben", "staff");
        return fs;
    }

    public static void main(String[] args) throws Exception {
        pathRules();
        makingDirectories();
        readingAndWriting();
        permissions();
        removing();
        moving();
        copying();
        symbolicLinks();
        globAndSearch();
        quotas();
        concurrentWrites();
        concurrentReadersAndWriters();
        if (failures > 0) System.exit(1);
    }

    private static void pathRules() {
        FileSystem fs = fresh();
        check(fs.read(ASHA, "home/x").code() == FsCode.INVALID_PATH, "a path must start with a slash");
        check(fs.mkdir(ASHA, "/home/asha/a", false).ok() && fs.write(ASHA, "//home///asha//a/./f.txt", "x", false).ok(), "repeated slashes and dots are ignored");
        check(fs.read(ASHA, "/home/asha/a/../a/f.txt").value().equals("x"), "dot-dot goes to the parent");
        check(fs.ls(ASHA, "/../../home").ok(), "dot-dot at the root stays at the root");
        check(fs.mkdir(ASHA, "/home/asha/..", true).code() == FsCode.INVALID_PATH, "a new folder cannot be called dot-dot");
        check(fs.rm(ROOT, "/", true).code() == FsCode.CANNOT_REMOVE_ROOT, "the root cannot be removed");
        check(fs.read(ASHA, "/home/asha/a/f.txt/more").code() == FsCode.NOT_A_DIRECTORY, "a file in the middle of a path is not a directory");
        check(fs.read(ASHA, "/home/asha/zzz").code() == FsCode.NOT_FOUND, "a missing name");
    }

    private static void makingDirectories() {
        FileSystem fs = fresh();
        check(fs.mkdir(ASHA, "/home/asha/a/b/c", false).code() == FsCode.NOT_FOUND, "without parents a missing folder is an error");
        check(fs.mkdir(ASHA, "/home/asha/a/b/c", true).ok(), "with parents all folders are created");
        check(fs.mkdir(ASHA, "/home/asha/a/b/c", true).ok(), "creating one that exists is fine with parents");
        check(fs.mkdir(ASHA, "/home/asha/a/b/c", false).code() == FsCode.ALREADY_EXISTS, "and an error without");
        fs.write(ASHA, "/home/asha/file", "x", false);
        check(fs.mkdir(ASHA, "/home/asha/file/sub", true).code() == FsCode.NOT_A_DIRECTORY, "a folder cannot be created inside a file");
        check(fs.mkdir(ASHA, "/home/asha/file", false).code() == FsCode.ALREADY_EXISTS, "nor with a file's name");
        check(fs.mkdir(BEN, "/home/asha/b", false).code() == FsCode.PERMISSION_DENIED, "no write permission on the parent");
        check(fs.stat(ASHA, "/home/asha/a").value().owner().equals("asha") && fs.stat(ASHA, "/home/asha/a").value().permissions().equals("rwxr-xr-x"), "new folders belong to their creator with mode 755");
        check(fs.ls(ASHA, "/home/asha").value().equals(List.of("a", "file")), "names are listed in order");
    }

    private static void readingAndWriting() {
        FileSystem fs = fresh();
        ManualClock clock = new ManualClock(0);
        FileSystem timed = new FileSystem(clock);
        timed.write(ROOT, "/f", "one", false);
        clock.advance(5_000);
        timed.write(ROOT, "/f", "two", true);
        check(timed.read(ROOT, "/f").value().equals("onetwo") && timed.stat(ROOT, "/f").value().modifiedAt() == 5_000, "append adds to the end and updates the modification time");
        timed.write(ROOT, "/f", "x", false);
        check(timed.read(ROOT, "/f").value().equals("x"), "write replaces");
        check(fs.write(ASHA, "/home/asha/u.txt", ("" + (char) 233 + (char) 233), false).ok() && fs.stat(ASHA, "/home/asha/u.txt").value().size() == 4, "size counts bytes, not characters");
        check(fs.read(ASHA, "/home/asha").code() == FsCode.IS_A_DIRECTORY && fs.write(ASHA, "/home/asha", "x", false).code() == FsCode.IS_A_DIRECTORY, "a directory cannot be read or written as a file");
        check(fs.write(ASHA, "/home/asha/nodir/f", "x", false).code() == FsCode.NOT_FOUND, "writing needs the folder to exist");
        check(fs.ls(ASHA, "/home/asha/u.txt").value().equals(List.of("u.txt")), "ls on a file shows the file");
        check(fs.stat(ASHA, "/home/asha").value().size() == 4, "the size of a folder is the size of everything in it");
    }

    private static void permissions() {
        FileSystem fs = fresh();
        fs.write(ASHA, "/home/asha/secret.txt", "s", false);
        fs.chmod(ASHA, "/home/asha/secret.txt", 0640);
        check(fs.read(ASHA, "/home/asha/secret.txt").ok(), "the owner reads");
        check(fs.read(BEN, "/home/asha/secret.txt").ok(), "the same group reads");
        check(fs.read(CHEN, "/home/asha/secret.txt").code() == FsCode.PERMISSION_DENIED, "others cannot read mode 640");
        check(fs.write(BEN, "/home/asha/secret.txt", "b", false).code() == FsCode.PERMISSION_DENIED, "the group cannot write mode 640");
        fs.chmod(ASHA, "/home/asha/secret.txt", 0660);
        check(fs.write(BEN, "/home/asha/secret.txt", "b", false).ok(), "but can after mode 660");
        check(fs.read(ROOT, "/home/asha/secret.txt").ok(), "root can always read");

        check(fs.chmod(BEN, "/home/asha/secret.txt", 0777).code() == FsCode.PERMISSION_DENIED, "only the owner can change the mode");
        check(fs.chown(ASHA, "/home/asha/secret.txt", "ben", "staff").code() == FsCode.PERMISSION_DENIED && fs.chown(ROOT, "/home/asha/secret.txt", "ben", "staff").ok(), "only root can change the owner");

        fs.mkdir(ASHA, "/home/asha/dir", false);
        fs.write(ASHA, "/home/asha/dir/f", "x", false);
        fs.chmod(ASHA, "/home/asha/dir", 0644);   // read but no execute
        check(fs.ls(ASHA, "/home/asha/dir").ok() && fs.read(ASHA, "/home/asha/dir/f").code() == FsCode.PERMISSION_DENIED, "a folder without execute can be listed but not passed through");
        fs.chmod(ASHA, "/home/asha/dir", 0311);   // execute but no read
        check(fs.ls(BEN, "/home/asha/dir").code() == FsCode.PERMISSION_DENIED && fs.read(BEN, "/home/asha/dir/f").ok(), "a folder with execute only can be passed through but not listed");
        check(fs.write(BEN, "/home/asha/dir/g", "x", false).code() == FsCode.PERMISSION_DENIED, "and creating a file needs write on the folder");
        check(Mode.text(0755).equals("rwxr-xr-x") && Mode.text(0640).equals("rw-r-----"), "modes print like ls does");
    }

    private static void removing() {
        FileSystem fs = fresh();
        fs.mkdir(ASHA, "/home/asha/d/e", true);
        fs.write(ASHA, "/home/asha/d/e/f", "12345", false);
        check(fs.rm(ASHA, "/home/asha/zzz", false).code() == FsCode.NOT_FOUND, "removing a missing name");
        check(fs.rm(ASHA, "/home/asha/d", false).code() == FsCode.NOT_EMPTY, "a folder with content needs the recursive flag");
        check(fs.rm(BEN, "/home/asha/d", true).code() == FsCode.PERMISSION_DENIED, "no write permission on the parent");
        fs.chmod(ASHA, "/home/asha/d/e", 0555);   // nobody may write inside e
        check(fs.rm(ASHA, "/home/asha/d", true).code() == FsCode.PERMISSION_DENIED, "a recursive remove fails when something inside cannot be emptied");
        check(fs.read(ASHA, "/home/asha/d/e/f").ok() && fs.usageOf("asha") == 5, "and it removed nothing");
        fs.chmod(ASHA, "/home/asha/d/e", 0755);
        check(fs.rm(ASHA, "/home/asha/d", true).ok() && fs.stat(ASHA, "/home/asha/d").code() == FsCode.NOT_FOUND, "the whole tree is removed");
        check(fs.usageOf("asha") == 0, "and its bytes are given back to the owner");
    }

    private static void moving() {
        FileSystem fs = fresh();
        fs.write(ASHA, "/home/asha/a.txt", "data", false);
        fs.mkdir(ASHA, "/home/asha/box", false);
        check(fs.mv(ASHA, "/home/asha/a.txt", "/home/asha/b.txt").ok() && fs.read(ASHA, "/home/asha/b.txt").value().equals("data"), "rename keeps the content");
        check(fs.mv(ASHA, "/home/asha/b.txt", "/home/asha/box").ok() && fs.read(ASHA, "/home/asha/box/b.txt").ok(), "moving to an existing folder puts the file inside");
        fs.write(ASHA, "/home/asha/c.txt", "c", false);
        check(fs.mv(ASHA, "/home/asha/c.txt", "/home/asha/box/b.txt").code() == FsCode.ALREADY_EXISTS, "an existing destination is not overwritten");
        check(fs.mv(ASHA, "/home/asha/box", "/home/asha/box/inner").code() == FsCode.MOVE_INTO_ITSELF, "a folder cannot move into itself");
        fs.mkdir(ASHA, "/home/asha/box/deep", false);
        check(fs.mv(ASHA, "/home/asha/box", "/home/asha/box/deep").code() == FsCode.MOVE_INTO_ITSELF, "nor into something below itself");
        check(fs.mv(ASHA, "/home/asha/zzz", "/home/asha/y").code() == FsCode.NOT_FOUND, "a missing source");
        check(fs.mv(BEN, "/home/asha/c.txt", "/home/ben/c.txt").code() == FsCode.PERMISSION_DENIED, "moving out of a folder needs write on it");
        check(fs.mv(ASHA, "/home/asha/c.txt", "/home/ben/c.txt").code() == FsCode.PERMISSION_DENIED, "and write on the target folder");
        check(fs.mv(ASHA, "/home/asha/box", "/home/asha/moved").ok() && fs.read(ASHA, "/home/asha/moved/b.txt").ok(), "a folder moves with everything in it");
        check(fs.usageOf("asha") == 5, "moving does not change quotas");
    }

    private static void copying() {
        FileSystem fs = fresh();
        fs.mkdir(ASHA, "/home/asha/src/sub", true);
        fs.write(ASHA, "/home/asha/src/a", "aaa", false);
        fs.write(ASHA, "/home/asha/src/sub/b", "bb", false);
        check(fs.cp(BEN, "/home/asha/src", "/home/ben/x", false).code() == FsCode.IS_A_DIRECTORY, "a folder needs the recursive flag");
        check(fs.cp(BEN, "/home/asha/src", "/home/ben/x", true).ok(), "a recursive copy works");
        check(fs.stat(BEN, "/home/ben/x/a").value().owner().equals("ben") && fs.usageOf("ben") == 5, "the copy belongs to the user who copied it and counts for them");
        fs.write(BEN, "/home/ben/x/a", "changed", false);
        check(fs.read(ASHA, "/home/asha/src/a").value().equals("aaa"), "the copy is independent of the original");
        check(fs.cp(BEN, "/home/asha/src", "/home/ben/x", true).code() == FsCode.ALREADY_EXISTS, "no overwriting");
        check(fs.cp(ASHA, "/home/asha/src", "/home/asha/src/sub/again", true).code() == FsCode.MOVE_INTO_ITSELF, "a folder cannot be copied into itself");
        fs.chmod(ASHA, "/home/asha/src/sub/b", 0600);
        check(fs.cp(BEN, "/home/asha/src", "/home/ben/y", true).code() == FsCode.PERMISSION_DENIED && fs.stat(BEN, "/home/ben/y").code() == FsCode.NOT_FOUND, "a file that cannot be read stops the copy and nothing is left behind");
        check(fs.cp(ASHA, "/home/asha/zzz", "/home/asha/q", false).code() == FsCode.NOT_FOUND, "copying something that is not there");
    }

    private static void symbolicLinks() {
        FileSystem fs = fresh();
        fs.mkdir(ASHA, "/home/asha/real", false);
        fs.write(ASHA, "/home/asha/real/f", "content", false);
        check(fs.symlink(ASHA, "/home/asha/real", "/home/asha/link").ok(), "a link to a folder");
        check(fs.read(ASHA, "/home/asha/link/f").value().equals("content"), "a path through the link reaches the real file");
        check(fs.stat(ASHA, "/home/asha/link").value().kind().equals("link"), "stat looks at the link itself");
        check(fs.write(ASHA, "/home/asha/link/g", "new", false).ok() && fs.read(ASHA, "/home/asha/real/g").value().equals("new"), "writing through the link writes the real folder");
        fs.symlink(ASHA, "/home/asha/real/f", "/home/asha/filelink");
        check(fs.write(ASHA, "/home/asha/filelink", "again", false).ok() && fs.read(ASHA, "/home/asha/real/f").value().equals("again"), "writing to a file link writes the target");
        fs.symlink(ASHA, "real/f", "/home/asha/relative");
        check(fs.read(ASHA, "/home/asha/relative").value().equals("again"), "a relative target is found from the link's folder");
        fs.symlink(ASHA, "/home/asha/nothing", "/home/asha/dangling");
        check(fs.read(ASHA, "/home/asha/dangling").code() == FsCode.NOT_FOUND, "a link to nothing reports not found");
        fs.symlink(ASHA, "/home/asha/b", "/home/asha/a");
        fs.symlink(ASHA, "/home/asha/a", "/home/asha/b");
        check(fs.read(ASHA, "/home/asha/a").code() == FsCode.TOO_MANY_LINKS, "a loop of links ends after 8 hops");
        check(fs.rm(ASHA, "/home/asha/link", false).ok() && fs.read(ASHA, "/home/asha/real/f").ok(), "removing a link leaves its target");
        check(fs.symlink(ASHA, "/x", "/home/asha/real").code() == FsCode.ALREADY_EXISTS, "a link cannot take an existing name");
    }

    private static void globAndSearch() {
        check(Glob.matches("*.txt", "a.txt") && !Glob.matches("*.txt", "a.txt.bak") && Glob.matches("a?c", "abc") && !Glob.matches("a?c", "ac"), "star and question mark");
        check(Glob.matches("*", "") && Glob.matches("*a*b*", "xxaxxbxx") && !Glob.matches("*a*b*", "xxbxxaxx") && Glob.matches("abc", "abc"), "star can match nothing and wildcards keep their order");
        FileSystem fs = fresh();
        fs.mkdir(ASHA, "/home/asha/p/q", true);
        fs.write(ASHA, "/home/asha/p/one.txt", "1", false);
        fs.write(ASHA, "/home/asha/p/q/two.txt", "22", false);
        fs.write(ASHA, "/home/asha/p/q/three.md", "333", false);
        check(fs.find(ASHA, "/home/asha", "*.txt").value().equals(List.of("/home/asha/p/one.txt", "/home/asha/p/q/two.txt")), "find returns paths in order");
        check(fs.find(ASHA, "/home/asha/p/", "q").value().equals(List.of("/home/asha/p/q")), "a trailing slash on the start is fine, and folders match too");
        check(fs.du(ASHA, "/home/asha/p").value() == 6 && fs.du(ASHA, "/home/asha/p/q/two.txt").value() == 2, "disk usage of a tree and of a file");
        check(fs.tree(ASHA, "/home/asha/p").value().equals("p/\\n  one.txt\\n  q/\\n    three.md\\n    two.txt\\n"), "tree draws folders with a slash and indents children");
        check(fs.find(ASHA, "/nope", "*").code() == FsCode.NOT_FOUND, "find on a missing start");
    }

    private static void quotas() {
        FileSystem fs = fresh();
        fs.setQuota("ben", 10);
        check(fs.write(BEN, "/home/ben/a", "123456", false).ok() && fs.usageOf("ben") == 6, "usage follows writes");
        check(fs.write(BEN, "/home/ben/b", "12345", false).code() == FsCode.QUOTA_EXCEEDED, "a write over the quota is refused");
        check(fs.stat(BEN, "/home/ben/b").code() == FsCode.NOT_FOUND, "and does not create the file");
        check(fs.write(BEN, "/home/ben/a", "1234567890", false).ok(), "growing a file up to exactly the quota is fine");
        check(fs.write(BEN, "/home/ben/a", "x", true).code() == FsCode.QUOTA_EXCEEDED, "one byte more is not");
        check(fs.write(BEN, "/home/ben/a", "12", false).ok() && fs.usageOf("ben") == 2, "shrinking a file frees space");
        fs.chown(ROOT, "/home/ben/a", "asha", "staff");
        check(fs.usageOf("ben") == 0 && fs.usageOf("asha") == 2, "chown moves the bytes to the new owner");
        fs.setQuota("chen", 1);
        fs.mkdir(ROOT, "/shared", false);
        fs.chmod(ROOT, "/shared", 0777);
        fs.write(BEN, "/home/ben/f", "12345", false);
        check(fs.cp(CHEN, "/home/ben/f", "/shared/b", false).code() == FsCode.QUOTA_EXCEEDED && fs.usageOf("chen") == 0 && fs.stat(CHEN, "/shared/b").code() == FsCode.NOT_FOUND, "a copy that does not fit is refused, uses no quota and leaves nothing behind");
    }

    private static void concurrentWrites() throws InterruptedException {
        FileSystem fs = fresh();
        fs.write(ASHA, "/home/asha/log", "", false);
        Thread[] threads = new Thread[8];
        for (int t = 0; t < threads.length; t++) {
            threads[t] = new Thread(() -> {
                for (int i = 0; i < 200; i++) fs.write(ASHA, "/home/asha/log", "x", true);
            });
        }
        for (Thread t : threads) t.start();
        for (Thread t : threads) t.join();
        check(fs.read(ASHA, "/home/asha/log").value().length() == 1_600, "8 threads appending 200 times each: no append is lost");
        check(fs.usageOf("asha") == 1_600, "and the quota accounting agrees");
    }

    private static void concurrentReadersAndWriters() throws InterruptedException {
        FileSystem fs = fresh();
        AtomicInteger errors = new AtomicInteger();
        List<Thread> threads = new ArrayList<>();
        for (int w = 0; w < 8; w++) {
            final int id = w;
            threads.add(new Thread(() -> {
                for (int i = 0; i < 100; i++) {
                    if (!fs.mkdir(ROOT, "/work/w" + id, true).ok()) errors.incrementAndGet();
                    if (!fs.write(ROOT, "/work/w" + id + "/f" + i + ".dat", "12345", false).ok()) errors.incrementAndGet();
                }
            }));
        }
        for (int r = 0; r < 4; r++) {
            threads.add(new Thread(() -> {
                for (int i = 0; i < 200; i++) {
                    Result<Long> du = fs.du(ROOT, "/");
                    Result<List<String>> found = fs.find(ROOT, "/", "*.dat");
                    if (!du.ok() || !found.ok() || du.value() % 5 != 0 || found.value().size() > 800) errors.incrementAndGet();
                }
            }));
        }
        for (Thread t : threads) t.start();
        for (Thread t : threads) t.join();
        check(errors.get() == 0, "readers running during 800 writes never see a half-written file: the size is always a whole number of 5-byte files");
        check(fs.du(ROOT, "/work").value() == 4_000 && fs.find(ROOT, "/work", "*.dat").value().size() == 800, "at the end all 800 files are there");
    }
}
`,
      },
    ],
    expectedOutput: [
      "mkdir /a/b/c without -p: NOT_FOUND",
      "mkdir -p: OK, again: ALREADY_EXISTS",
      "Ben writes into Asha's folder: PERMISSION_DENIED",
      "notes.txt: line one|line two|",
      "ls /home/asha/a: [b, notes.txt]",
      "stat: Stat[kind=file, size=18, owner=asha, group=staff, permissions=rw-r--r--, modifiedAt=1000]",
      "Ben (same group) reads: OK, Chen reads: PERMISSION_DENIED",
      "Through a link: OK",
      "A link loop: TOO_MANY_LINKS",
      "cp -r: OK, du of the copy: 18 bytes",
      "mv into its own subtree: MOVE_INTO_ITSELF",
      "mv into a folder: OK, [c, notes.txt]",
      "rm non-empty folder: NOT_EMPTY, with -r: OK",
      "home/",
      "  asha/",
      "    loop1",
      "    shortcut",
      "  ben/",
      "    big.txt",
      "      b/",
      "        c/",
      "      notes.txt",
    ],
  },
};
