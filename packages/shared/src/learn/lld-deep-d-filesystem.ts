import type { LldDeep, LldExtra, LldGuide } from "./types";

// Guide, recap, walkthrough and diagrams for the in-memory file system project in lld-projects-d-filesystem.ts.
// Rules: no backticks or dollar-brace in the text (template literals), quote every Mermaid node label,
// no semicolons or hash signs in diagram text.

export const FILESYSTEM_GUIDE: LldGuide = {
  requirements: [
    "A tree of directories, files and symbolic links addressed by absolute paths with slashes, including . and .. and repeated slashes.",
    "mkdir (with parents), write and append, read, ls, stat, rm (recursive), mv, cp (recursive), find with wildcards, du, tree.",
    "Unix-like permissions: owner, group and others with read, write and execute. Execute on a directory means passing through it.",
    "Symbolic links with loop protection. A byte quota per owner. Reads in parallel, writes one at a time.",
    "Expected failures are result codes (NOT_FOUND, PERMISSION_DENIED, NOT_EMPTY and so on), never exceptions.",
  ],
  entities: [
    "Node (abstract), FileNode, DirNode (sorted children), LinkNode (a path)",
    "FileSystem (facade, path walking, one read-write lock), User, Mode (permission bits), Result and FsCode",
    "NodeVisitor (du, find, release), Glob, Stat, TimeSource",
  ],
  patterns: [
    "Composite: files, directories and links are all nodes",
    "Visitor: a new walk over the tree is a new visitor",
    "Read-write lock around the tree; result objects for expected failures",
    "Path walking as one function that checks permission at every step",
  ],
  code: `abstract class Node {
  String name; DirNode parent; String owner; String group; int mode; long modifiedAt;
  abstract long size();
  abstract void accept(NodeVisitor visitor, String path);
}

final class DirNode extends Node {
  private final Map<String, Node> children = new TreeMap<>();
  long size() { long sum = 0; for (Node n : children.values()) sum += n.size(); return sum; }
  void accept(NodeVisitor v, String path) {
    v.visitDirectory(this, path);
    for (Node n : children.values()) n.accept(v, path.equals("/") ? "/" + n.name : path + "/" + n.name);
  }
}

private Result<Node> walk(User who, DirNode start, List<String> parts, boolean followLast, int hops) {
  Node current = start;
  for (String part : parts) {
    if (!(current instanceof DirNode dir)) return Result.fail(FsCode.NOT_A_DIRECTORY);
    if (!Mode.allows(who, dir, Mode.EXECUTE)) return Result.fail(FsCode.PERMISSION_DENIED);
    Node next = dir.child(part);
    if (next == null) return Result.fail(FsCode.NOT_FOUND);
    current = next;           // links are followed here, with a hop limit
  }
  return Result.ok(current);
}`,
  extensions: [
    "Hard links: two directory entries pointing at one file node, with a link count and removal when it reaches zero.",
    "File content as chunks or a rope instead of one string, so appends and large files are cheap.",
    "Per-directory locks (lock coupling) so operations in different branches run in parallel.",
    "Watchers that are told when something under a path changes (Observer), and a trash folder instead of immediate removal.",
  ],
};

export const FILESYSTEM_EXTRA: LldExtra = {
  recap: [
    "Composite: FileNode, DirNode and LinkNode share the Node base. A directory keeps its children in a sorted map, so listings come out in order.",
    "One function walks a path from the root: it needs execute on every directory it passes, handles . and .., and follows links with a limit of 8 hops.",
    "Permissions are three octal digits for owner, group and others. Read lists a directory, write adds and removes entries, execute lets you pass through. Root is always allowed.",
    "Reads (read, ls, stat, find, du, tree) take the shared lock; anything that changes the tree takes the exclusive lock. Quotas are accounted at every write, removal, copy and chown.",
  ],
  flow: [
    "write(asha, /home/asha/a/notes.txt, text, append): take the exclusive lock, split the path and find the parent directory by walking, checking execute at every directory.",
    "The file does not exist yet, so the parent needs write permission. A FileNode owned by asha with mode 0644 is created.",
    "The new size is computed in UTF-8 bytes and the quota of the owner is checked against the change. If it fits, the content is set and the usage is updated.",
    "Later, ben reads the file: the shared lock, the same walk (execute on /home, /home/asha, /home/asha/a), then read permission on the file: owner, group or others bits are chosen by who ben is.",
    "rm -r of a directory first checks that every directory inside can be emptied, then returns the bytes to their owners and removes the subtree in one step.",
  ],
  edgeCases: [
    "Repeated slashes, dots, dot-dot at the root, a path that is not absolute, a file in the middle of a path, a folder called dot-dot.",
    "Execute without read on a directory (pass through but not list) and read without execute (list but not pass through).",
    "A recursive remove that would fail half way (nothing is removed), a copy of a tree that contains an unreadable file (nothing is copied).",
    "Moving a directory into itself or below itself, moving onto an existing name, copying into itself.",
    "Link loops, dangling links, relative link targets, removing a link (the target stays).",
    "Eight threads appending to one file; readers running while writers create files.",
  ],
};

export const FILESYSTEM_DEEP: Record<string, LldDeep> = {
  "lldp-file-system-kv": {
    walkthrough: [
      {
        title: "What to clarify first",
        body: `An in-memory file system is a tree, and the question is how far the interviewer wants to go beyond the tree. The easy version is a map of names to children with mkdir, ls and a file with content. The rich version has permissions, links, quotas and concurrency, and each of those changes the design in a specific way. It is worth asking early which version is meant, and then saying what you will leave out.

Ask about the structure. Are there only files and directories, or also links? Are paths absolute only, or is there a current directory? Do dot and dot-dot count? Ask about operations: mkdir with parents, write and append, read, ls, remove (and recursive remove), move, copy, find with patterns, disk usage. Ask about users: is there more than one, and are there permissions? What happens when something is not allowed or not there: does the call throw or return a code? Ask about limits: a quota per user, a maximum depth, a maximum file size. Ask about concurrency: many readers, many writers?

The requirements we fix are in the guide above. Three decisions to say aloud. First, the tree is a Composite: files, directories and links are all Nodes, so the walking code does not care which is which until it has to. Second, failures are values. A missing file or a forbidden write is a normal thing for a file system call to answer, so every call returns a Result with an FsCode. Third, there is one function that walks paths, and every operation uses it, so permission checks and link handling exist in exactly one place.

Say what is simplified: file content is a String and sizes are counted in UTF-8 bytes, and there are no hard links, no timestamps beyond the last modification, and no persistence.`,
      },
      {
        title: "The model: Composite and Visitor",
        body: `Node is an abstract class with what every entry has: a name, a parent, an owner, a group, permission bits and a modification time. Three subclasses follow. FileNode holds a string and its size in UTF-8 bytes. DirNode holds its children in a TreeMap, so listings come out sorted without any extra work, and its size is the sum of the sizes below it, computed when asked. LinkNode holds a path, the target it points at.

Why compute a directory's size on demand? Caching it would mean updating every ancestor on every write, and a bug in that update gives wrong numbers that nobody notices. Computing it costs a walk of the subtree, which is fine for du and stat, and the test for a directory's size says that it equals the size of what is in it.

The Visitor pattern keeps tree walks out of the node classes. Node has one method, accept(visitor, path), and each subclass calls the matching method of the visitor: visitFile, visitDirectory or visitLink. DirNode also passes the visitor to its children with the child's path, so a visitor always knows the full path of what it is visiting. Disk usage is a visitor that adds up file sizes. Find is a visitor that collects the paths whose name matches a pattern. Releasing quota when a subtree is removed is a visitor that gives each file's bytes back to its owner. A new walk, such as a checksum of a tree, is a new visitor, and no node class changes.

The alternative is an if-chain with instanceof in every operation, which is what the code would be without these two patterns, and which gets longer for every new kind of node. The design has one place that knows each kind: the node class and its accept method.`,
      },
      {
        title: "Walking a path, once",
        body: `Every operation starts with a path, and the hardest bugs in a file system come from handling paths in two places. FileSystem therefore has one function, walk(who, start, parts, followLast, hops), and everything else is built on it.

The path is split on slashes. Empty parts, from repeated slashes, are dropped. A path that does not start with a slash is rejected as INVALID_PATH. The walk starts at the root with a current node. For each part, the current node must be a directory (otherwise NOT_A_DIRECTORY), and the user must have execute permission on it (otherwise PERMISSION_DENIED), which is the Unix rule: to look up a name in a directory you need execute on that directory. A dot stays where it is, and dot-dot goes to the parent, and at the root it stays at the root. Anything else is looked up in the directory's children, and a missing name is NOT_FOUND.

Links are followed inside the same loop. If the next node is a link, and it is not the last part or the caller asked to follow the last part, the link's target path is walked, from the root if the target is absolute and from the directory the link is in if it is relative. Every followed link adds one to a hop count, and at 8 hops the walk answers TOO_MANY_LINKS. That is what stops a link that points at itself or two links that point at each other. stat is the one operation that does not follow the last link, so it can tell you that something is a link.

A related function, parentOf, returns the directory that holds the last part of a path, plus the name. Operations that create, remove, move or copy an entry use it, because they need to change a directory and not look inside the thing. It rejects an empty path with the special code CANNOT_REMOVE_ROOT and a last part of dot or dot-dot as invalid.`,
      },
      {
        title: "Permissions the Unix way",
        body: `Each node has three octal digits, for its owner, its group and everyone else, and each digit is made of read (4), write (2) and execute (1). 0755 means the owner may do anything and everybody else may read and pass through. Mode.allows(user, node, wanted) picks the digit: owner if the user's name is the node's owner, else group if the user is in the node's group, else others. Then it checks that all wanted bits are set. Root is allowed everything, which is the one exception.

What the bits mean depends on the kind of node, and this is where candidates are caught. On a file, read lets you read the content and write lets you change it. On a directory, read lets you list the names, write lets you add and remove entries, and execute lets you pass through to what is inside. They are independent. A directory with 0644 can be listed, but nothing inside it can be reached. A directory with 0311 cannot be listed, but a file inside can be read if you know its name. Both cases are tests.

Who may change what? chmod is for the owner and root. chown is for root only, because giving your files to someone else would let you use their quota. Creating an entry needs write on the parent directory (and execute to reach it), and removing needs the same, not any permission on the file itself. That is the real Unix rule, and it surprises people: you can delete a read-only file if you can write its folder.

New files get mode 0644 and new directories 0755, owned by the creator, with the first of the creator's groups. A real system would use a umask and a primary group per user. Say so, and move on.`,
      },
      {
        title: "Changing the tree: write, remove, move, copy",
        body: `write(user, path, text, append) finds the parent, and if the name exists it must be a file the user may write (a link to a file is followed, and a directory is IS_A_DIRECTORY). If it does not exist, the parent needs write permission and a FileNode is created. The new content is the old plus the text for an append, or the text alone. The quota is checked on the change in size before anything is modified, so a refused write leaves no trace: the test checks that a refused write did not create the file.

rm removes one entry. A directory with content needs the recursive flag, otherwise NOT_EMPTY. A recursive remove is checked before it changes anything: canRemoveTree walks the subtree and requires write and execute on every directory in it. If any of them fails, nothing is removed. This all-or-nothing rule is what a user expects, and the test makes one inner directory unwritable and checks that the file inside is still there and the quota unchanged. When it goes ahead, a visitor gives the bytes of every file back to its owner.

mv moves or renames. If the destination is an existing directory, the node goes inside it with its own name. Otherwise the destination's parent must exist and the name must be free: an existing target is ALREADY_EXISTS and nothing is overwritten. Moving a directory into itself or below itself would cut a branch off the tree, so the code walks up from the target directory looking for the node being moved and answers MOVE_INTO_ITSELF. Both parents need write permission. Quotas do not change, because the same bytes have the same owner.

cp makes a deep copy. The copy belongs to the user who made it and counts against their quota, which is checked for the whole tree before the copy is attached, so a copy that does not fit leaves nothing behind. Reading is checked for the whole source tree first, so an unreadable file anywhere stops the copy.`,
      },
      {
        title: "Quotas, find and du",
        body: `A quota is a limit on the bytes owned by one user. The file system keeps two maps: the quota per owner (when set) and the usage per owner. Usage is not computed by walking the tree. It is updated by the calls that change it: write adds the change in size (which is negative when a file shrinks), rm gives back the sizes of everything removed, cp adds the size of the copy to the copier, and chown moves a file's bytes from the old owner to the new one. A write is refused with QUOTA_EXCEEDED when usage plus the change would be more than the quota. The tests cover growing a file exactly to the quota, one byte beyond it, shrinking, chown, and a copy that does not fit.

Why keep a counter instead of summing? A walk per write would be linear in the size of the file system. The price of the counter is the risk that it drifts from the truth, and the defence is a test that compares them: the thread test checks that usage equals the length of a file after 1600 appends from 8 threads.

find(user, start, pattern) walks the subtree with a visitor and returns the paths whose last name matches a wildcard. Glob is a tiny recursive matcher: star matches any run of characters including none, question mark matches exactly one. Because DirNode keeps its children in a sorted map, the results come out in path order without sorting. du walks with a visitor and adds file sizes. tree draws an indented picture, with a slash after directory names.

Notice that du, find and ls take the shared lock, not the exclusive one. They change nothing, so any number of them can run at once, and only a write makes them wait.`,
      },
      {
        title: "The main flow, step by step",
        body: `Run Main and follow it. Root creates /home and a folder for each of two users and gives them to the users with chown. Asha tries mkdir of a/b/c without parents and gets NOT_FOUND; with parents it works, and doing it again without parents gives ALREADY_EXISTS. Ben writes into Asha's folder and is refused. Asha writes a file twice, once replacing and once appending, and reads back two lines. A path with dots, a/b/../../a/./notes.txt, resolves to the same file.

ls shows the folder content in order, and stat shows the size in bytes (18), the owner, the group and the permissions as rw-r--r--. Asha changes the file to 0640: Ben, in the same group, can still read it, and Chen, in another group, cannot. Asha then changes her home folder to 0700 and Ben is refused even though the file itself is readable, because he cannot pass through the folder. A symbolic link to the folder makes a path through it work, and two links that point at each other end in TOO_MANY_LINKS.

Ben copies Asha's tree with the recursive flag, and the copy is 18 bytes. find with *.txt finds both files, in order. Moving a folder into a subfolder of itself is refused, and moving a file into a folder works. Removing a non-empty folder needs the flag. Ben gets a quota of 100 bytes, writes 60 and has 78 used (the copy counts), and a second 60-byte write is refused. The tree is printed. Last, a path without a slash is INVALID_PATH and removing the root is CANNOT_REMOVE_ROOT.

The tests go much further: every code of every call, the permission matrix including execute-only folders, an all-or-nothing remove and copy, and the two concurrency tests.`,
      },
      {
        title: "Concurrency, extensions and what interviewers probe",
        body: `A file system is shared by many users, and a simple answer is one read-write lock around the whole tree. Calls that only look (read, ls, stat, find, du, tree) take the shared lock, so many run at the same time, and calls that change the tree (mkdir, write, rm, mv, cp, chmod, chown, symlink) take the exclusive lock. Writers wait for readers and the other way round, and every call sees the tree before or after another call, never in the middle. This is correct and simple, and it is the right answer to give first.

Two tests check it. Eight threads append one character 200 times each to one file, and the file ends up with exactly 1600 characters: because the append is read, add and replace under the exclusive lock, no append is lost, and the quota accounting agrees. Then eight writers create 800 files while four readers repeatedly compute disk usage and run find: no reader ever sees a half-written file, which shows as a size that is always a whole number of five-byte files, and at the end all 800 files are there.

When the one lock becomes a bottleneck, the next step is lock coupling: lock a directory, find the child, lock the child, release the parent, and so on down the path, so operations in different branches run in parallel. It needs a lock order (parent before child, and a consistent order for two nodes in a move) and care for operations that touch two places, such as mv and cp. Say that you know it, and that you would measure first.

Extensions. Hard links need a link count on the file node and removal when it reaches zero. A rope or chunk list for content makes appends cheap. Watchers are an Observer that is notified when a path changes. A trash folder turns remove into move. Persistence is a log of operations replayed at start, plus snapshots. A umask and primary groups complete the permission model.

Probes, with short answers. Why Composite? So every operation treats nodes alike. Why Visitor? New walks without changing node classes. Why a Result and not exceptions? Failures here are expected. Why execute on a directory? It is the Unix rule for looking up a name. Why is mv into itself refused? It would detach a branch from the tree. How would you make it persistent? An append-only log of changes and periodic snapshots.`,
      },
    ],
    classDiagram: `classDiagram
    class FileSystem {
        +mkdir(who, path, parents) Result
        +write(who, path, text, append) Result
        +read(who, path) Result
        +ls(who, path) Result
        +stat(who, path) Result
        +rm(who, path, recursive) Result
        +mv(who, from, to) Result
        +cp(who, from, to, recursive) Result
        +chmod(who, path, mode) Result
        +chown(who, path, owner, group) Result
        +symlink(who, target, linkPath) Result
        +find(who, start, pattern) Result
        +du(who, path) Result
        +tree(who, path) Result
        +setQuota(owner, bytes)
    }
    class Node {
        <<abstract>>
        name
        parent
        owner
        group
        mode
        +size() long
        +accept(visitor, path)
    }
    class FileNode {
        content
    }
    class DirNode {
        children
    }
    class LinkNode {
        target
    }
    class NodeVisitor {
        <<interface>>
        +visitFile(file, path)
        +visitDirectory(dir, path)
        +visitLink(link, path)
    }
    class Mode {
        +allows(user, node, wanted) boolean
        +text(mode) String
    }
    class User {
        name
        groups
    }
    class Result {
        <<record>>
        code
        value
    }
    FileSystem --> DirNode
    FileSystem --> Mode
    FileSystem --> NodeVisitor
    FileSystem --> User
    FileSystem --> Result
    Node <|-- FileNode
    Node <|-- DirNode
    Node <|-- LinkNode
    DirNode --> Node
    Node ..> NodeVisitor
    Mode ..> Node`,
    sequenceDiagram: `sequenceDiagram
    actor Asha
    participant F as FileSystem
    participant L as ReadWriteLock
    participant P as walk
    participant D as DirNode
    Asha->>F: write(asha, /home/asha/a/notes.txt, text, append)
    F->>L: lock exclusive
    F->>P: parentOf(path)
    P->>D: check execute on each directory on the way
    D-->>P: allowed
    P-->>F: directory a and the name notes.txt
    F->>F: file exists or create it, check write permission
    F->>F: new size in bytes, quota check
    F->>D: set content, add to the directory, update usage
    F->>L: unlock
    F-->>Asha: Result OK`,
    extraDiagrams: [
      {
        title: "Walking a path",
        caption: "One function for every operation, so permission checks and link handling exist once.",
        source: `flowchart TD
    S["Next part of the path"] --> D{"Current node is a directory?"}
    D -- no --> E1["NOT_A_DIRECTORY"]
    D -- yes --> X{"User has execute on it?"}
    X -- no --> E2["PERMISSION_DENIED"]
    X -- yes --> P{"Part is dot or dot-dot?"}
    P -- "dot" --> S
    P -- "dot-dot" --> UP["Go to the parent, the root stays the root"]
    UP --> S
    P -- "a name" --> N{"Child exists?"}
    N -- no --> E3["NOT_FOUND"]
    N -- yes --> L{"A link, and not the last part or followLast?"}
    L -- no --> M["Move to the child"]
    L -- yes --> H{"Hops at 8?"}
    H -- yes --> E4["TOO_MANY_LINKS"]
    H -- no --> W["Walk the link target, hops + 1"]
    W --> M
    M --> S`,
      },
      {
        title: "Who gets which permission digit",
        caption: "Root is always allowed. Otherwise the owner, group and other digits are picked in that order.",
        source: `flowchart TD
    A["Mode.allows(user, node, wanted)"] --> R{"User is root?"}
    R -- yes --> OK["Allowed"]
    R -- no --> O{"User name equals the owner?"}
    O -- yes --> D1["Use the owner digit"]
    O -- no --> G{"User is in the node's group?"}
    G -- yes --> D2["Use the group digit"]
    G -- no --> D3["Use the others digit"]
    D1 --> C{"All wanted bits set?"}
    D2 --> C
    D3 --> C
    C -- yes --> OK
    C -- no --> NO["Denied"]`,
      },
      {
        title: "What read, write and execute mean",
        caption: "On a directory the three bits are about the names inside it, not about content.",
        source: `flowchart LR
    B["Permission bit"] --> F["On a file"]
    B --> DD["On a directory"]
    F --> F1["read: see the content"]
    F --> F2["write: change the content"]
    F --> F3["execute: run it (not modelled)"]
    DD --> D1["read: list the names"]
    DD --> D2["write: add and remove entries"]
    DD --> D3["execute: pass through to what is inside"]`,
      },
      {
        title: "Remove is all or nothing",
        caption: "Check the whole subtree first, then give back the bytes and remove it in one step.",
        source: `sequenceDiagram
    participant F as FileSystem
    participant T as canRemoveTree
    participant V as release visitor
    participant D as Parent directory
    F->>F: parent needs write, node exists
    F->>T: every directory below needs write and execute
    alt something cannot be emptied
        T-->>F: false
        F-->>F: PERMISSION_DENIED, nothing changed
    else all can
        T-->>F: true
        F->>V: visit every file, usage minus size for its owner
        F->>D: remove the node
    end`,
      },
      {
        title: "Moving without cutting a branch off",
        caption: "Walk up from the target directory. If the moved node is on the way, the move would detach it from the tree.",
        source: `flowchart TD
    M["mv a to b"] --> T{"b is an existing directory?"}
    T -- yes --> IN["Target directory is b, name is the name of a"]
    T -- no --> NM["Target directory is the parent of b, name is the last part of b"]
    IN --> E{"Name already used there?"}
    NM --> E
    E -- yes --> X1["ALREADY_EXISTS"]
    E -- no --> U{"Is a on the way up from the target directory?"}
    U -- yes --> X2["MOVE_INTO_ITSELF"]
    U -- no --> P{"Write on both parents?"}
    P -- no --> X3["PERMISSION_DENIED"]
    P -- yes --> DO["Remove from the old parent, rename, add to the new"]`,
      },
      {
        title: "Quota accounting",
        caption: "Usage is a counter updated by each operation that changes bytes, so a write never has to walk the tree.",
        source: `flowchart TD
    W["write: new size minus old size"] --> C{"usage + change over the quota?"}
    C -- yes --> R["QUOTA_EXCEEDED, nothing created or changed"]
    C -- no --> U["Set content, usage + change"]
    RM["rm: visitor adds minus size for each file"] --> U2["Usage of each owner goes down"]
    CP["cp: size of the copy"] --> C2{"copier's usage + size over the quota?"}
    C2 -- yes --> R
    C2 -- no --> U3["Usage of the copier goes up"]
    CH["chown: size of the file"] --> U4["Moves from the old owner to the new one"]`,
      },
      {
        title: "Object snapshot of the demo tree",
        caption: "Directories keep children sorted. Links hold a path, files hold content.",
        source: `flowchart TD
    R["/ (root)"] --> H["home"]
    H --> A["asha: asha staff 0755"]
    H --> B["ben: ben staff 0755"]
    A --> AA["a: directory"]
    A --> SC["shortcut: link to /home/asha/a"]
    AA --> N["notes.txt: 18 bytes, 0640"]
    AA --> AB["b/c"]
    B --> CP["copy: owned by ben"]
    CP --> CN["notes.txt: 18 bytes"]`,
      },
      {
        title: "Where the extensions attach",
        caption: "Each follow-up question lands in one place.",
        source: `flowchart TD
    X["Follow-up questions"] --> HL["Hard links"]
    X --> LK["Finer locking"]
    X --> WT["Watchers"]
    X --> PS["Persistence"]
    X --> TR["Trash"]
    HL --> HL1["Link count on FileNode, remove at zero"]
    LK --> LK1["Lock coupling down the path with a lock order"]
    WT --> WT1["Observer called after each change"]
    PS --> PS1["Append-only log of operations plus snapshots"]
    TR --> TR1["rm becomes mv into a trash directory"]`,
      },
    ],
    concurrency: [
      "One ReentrantReadWriteLock for the whole tree. read, ls, stat, find, du and tree take the shared lock and run in parallel; mkdir, write, rm, mv, cp, chmod, chown and symlink take the exclusive lock.",
      "An append is read, add and replace inside the exclusive lock, so eight threads appending 200 times each end with exactly 1600 characters and a matching quota.",
      "Readers never see a half-done change: every call sees the tree before or after another call. The test runs readers during 800 file creations and checks the sizes stay whole.",
      "Operations that look at the whole subtree first (recursive remove, copy) check everything before changing anything, so a failure part way leaves the tree as it was.",
      "A finer design uses lock coupling: lock the directory, find the child, lock the child, release the parent. It needs a lock order, and extra care for mv and cp, which touch two places.",
      "Time is injected (TimeSource), so modification times are tested without sleeping.",
    ],
  },
};
