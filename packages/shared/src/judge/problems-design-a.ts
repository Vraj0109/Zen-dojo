import { callList, designProblem, rng, seq } from "./design";
import type { ProblemSpec } from "./types";

// "Design a class" problems, part 1: caches, tries and a time-based store. Each test is a list of calls and a list of
// answers (null for the constructor and for methods that return nothing). Statements, tests and reference solutions are
// written for this app. The expected answers of the tests below were checked by running the C++ reference.

const between = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const letters = (r: () => number, n: number, alphabet: number) => Array.from({ length: n }, () => String.fromCharCode(97 + between(r, 0, alphabet - 1))).join("");

const CALLS = "Each test gives the operations in order (the class name first, then method names) and their arguments; the expected answer has one entry per operation, with null for the constructor and for methods that return nothing.";

export const DESIGN_SPECS_A: ProblemSpec[] = [
  designProblem({
    id: "lc-146",
    title: "LRU Cache",
    statement: [
      "Design a cache that holds at most capacity key-value pairs and throws out the least recently used pair when it is full.",
      "get(key) returns the value stored for key, or -1 if there is none. put(key, value) stores the pair; if the key is already there it only changes its value. When a put would take the cache over capacity, the pair that was used longest ago is removed first. Both get and put count as using a key. Both must run in O(1) on average.",
      CALLS,
    ],
    constraints: ["1 <= capacity <= 3000", "0 <= key <= 100000", "0 <= value <= 1000000000", "At most 200000 calls to get and put"],
    design: {
      className: "LRUCache",
      ctor: [{ name: "capacity", type: "int" }],
      methods: [
        { name: "get", params: [{ name: "key", type: "int" }], returns: "int" },
        { name: "put", params: [{ name: "key", type: "int" }, { name: "value", type: "int" }], returns: "void" },
      ],
    },
    examples: [
      { ...seq("LRUCache(2) put(1,1) put(2,2) get(1) put(3,3) get(2) put(4,4) get(1) get(3) get(4)", [null, null, null, 1, null, -1, null, -1, 3, 4]), explanation: "get(1) makes key 1 the most recent, so put(3,3) throws out key 2. Then put(4,4) throws out key 1." },
      { ...seq("LRUCache(1) put(2,1) get(2) put(3,2) get(2) get(3)", [null, null, 1, null, -1, 2]), explanation: "With room for one pair, every new key replaces the old one." },
    ],
    tests: [
      seq("LRUCache(2) put(2,1) put(1,1) put(2,3) put(4,1) get(1) get(2)", [null, null, null, null, null, -1, 3]),
      seq("LRUCache(2) get(2) put(2,6) get(1) put(1,5) put(1,2) get(1) get(2)", [null, -1, null, -1, null, null, 2, 6]),
      seq("LRUCache(3) put(1,1) put(2,2) put(3,3) put(4,4) get(4) get(3) get(2) get(1) put(5,5) get(1) get(2) get(3) get(4) get(5)", [null, null, null, null, null, 4, 3, 2, -1, null, -1, 2, 3, -1, 5]),
      seq("LRUCache(2) put(1,0) put(2,0) get(1) put(3,0) get(2) get(3) get(1)", [null, null, null, 0, null, -1, 0, 0]),
      seq("LRUCache(2) put(1,1) put(1,2) put(1,3) get(1) put(2,4) put(3,5) get(1) get(2) get(3)", [null, null, null, null, 3, null, null, -1, 4, 5]),
      seq("LRUCache(1) put(1,1) put(2,2) get(1) get(2) put(2,3) get(2) put(1,4) get(2) get(1)", [null, null, null, -1, 2, null, 3, null, -1, 4]),
    ],
    hints: [
      "A hash map finds a key in O(1) but knows nothing about order. A list knows the order but cannot find a key quickly. You need both.",
      "Keep the keys in a doubly linked list from most recent to least recent, and a hash map from key to its place in that list. Moving a node to the front or removing the last one is O(1) when you already hold the node.",
      "On get and on put of an existing key, move that node to the front. On put of a new key when the cache is full, remove the node at the back (and its map entry) before inserting.",
    ],
    solution: {
      idea: [
        "Keep a doubly linked list of pairs ordered from most recently used (front) to least recently used (back), and a hash map from key to the list node.",
        "get looks the key up, moves its node to the front and returns the value. put of an existing key changes the value and moves the node to the front. put of a new key first removes the back node and its map entry if the cache is full, then adds a node at the front and a map entry.",
        "Moving a node is O(1) because the map gives you the node and a doubly linked list can unlink it without searching.",
      ],
      complexity: "O(1) per call, O(capacity) space.",
      cpp: `class LRUCache {
    int cap;
    list<pair<int, int>> items;  // most recently used first
    unordered_map<int, list<pair<int, int>>::iterator> where;
public:
    LRUCache(int capacity) : cap(capacity) {}

    int get(int key) {
        auto it = where.find(key);
        if (it == where.end()) return -1;
        items.splice(items.begin(), items, it->second);  // move to the front
        return it->second->second;
    }

    void put(int key, int value) {
        auto it = where.find(key);
        if (it != where.end()) {
            it->second->second = value;
            items.splice(items.begin(), items, it->second);
            return;
        }
        if ((int)items.size() == cap) {
            where.erase(items.back().first);
            items.pop_back();
        }
        items.emplace_front(key, value);
        where[key] = items.begin();
    }
};
`,
    },
    stress: [
      {
        label: "200000 mixed calls, 2000 keys, capacity 1000",
        make: () => {
          const r = rng(146);
          const ops: string[] = ["LRUCache"];
          const args: unknown[][] = [[1000]];
          for (let i = 0; i < 200000; i++) {
            if (r() < 0.5) { ops.push("put"); args.push([between(r, 0, 1999), between(r, 0, 1000000000)]); }
            else { ops.push("get"); args.push([between(r, 0, 1999)]); }
          }
          return callList(ops, args);
        },
      },
      {
        label: "100000 puts then 100000 gets, capacity 100000",
        make: () => {
          const ops: string[] = ["LRUCache"];
          const args: unknown[][] = [[100000]];
          for (let i = 0; i < 100000; i++) { ops.push("put"); args.push([i, i]); }
          for (let i = 0; i < 100000; i++) { ops.push("get"); args.push([i]); }
          return callList(ops, args);
        },
      },
    ],
  }),

  designProblem({
    id: "lc-460",
    title: "LFU Cache",
    statement: [
      "Design a cache that holds at most capacity key-value pairs and, when it is full, throws out the least frequently used pair.",
      "get(key) returns the value stored for key, or -1 if there is none. put(key, value) stores the pair, or only changes the value if the key is already there. Every get or put of a key adds one to that key's use count. When a put of a new key would take the cache over capacity, remove the key with the smallest use count first; if several keys share the smallest count, remove the one used longest ago. A key that is added starts with a count of 1. Both calls must run in O(1) on average.",
      "With capacity 0 nothing is ever stored.",
      CALLS,
    ],
    constraints: ["0 <= capacity <= 10000", "0 <= key <= 100000", "0 <= value <= 1000000000", "At most 200000 calls to get and put"],
    design: {
      className: "LFUCache",
      ctor: [{ name: "capacity", type: "int" }],
      methods: [
        { name: "get", params: [{ name: "key", type: "int" }], returns: "int" },
        { name: "put", params: [{ name: "key", type: "int" }, { name: "value", type: "int" }], returns: "void" },
      ],
    },
    examples: [
      { ...seq("LFUCache(2) put(1,1) put(2,2) get(1) put(3,3) get(2) get(3) put(4,4) get(1) get(3) get(4)", [null, null, null, 1, null, -1, 3, null, -1, 3, 4]), explanation: "put(3,3) removes key 2 (used once, key 1 was used twice). Then keys 1 and 3 both have count 2, and key 1 was used longer ago, so put(4,4) removes key 1." },
    ],
    tests: [
      seq("LFUCache(0) put(0,0) get(0)", [null, null, -1]),
      seq("LFUCache(1) put(1,1) put(2,2) get(1) get(2)", [null, null, null, -1, 2]),
      seq("LFUCache(2) put(1,1) put(2,2) put(1,10) put(3,3) get(2) get(1) get(3)", [null, null, null, null, null, -1, 10, 3]),
      seq("LFUCache(3) put(1,1) put(2,2) put(3,3) get(1) get(1) get(2) put(4,4) get(3) get(4) get(2) get(1)", [null, null, null, null, 1, 1, 2, null, -1, 4, 2, 1]),
      seq("LFUCache(2) put(1,1) put(2,2) put(3,3) get(1) get(2) get(3)", [null, null, null, null, -1, 2, 3]),
      seq("LFUCache(2) put(3,1) put(2,1) put(2,2) put(4,4) get(2) get(3) get(4)", [null, null, null, null, null, 2, -1, 4]),
      seq("LFUCache(2) put(2,1) put(3,2) get(3) get(2) put(4,3) get(2) get(3) get(4)", [null, null, null, 2, 1, null, 1, -1, 3]),
    ],
    hints: [
      "You need to find the key with the lowest use count quickly, and among those the one used longest ago. Think of one list of keys for every use count.",
      "Keep a hash map from key to (value, count) and a hash map from count to a list of keys, newest at the front. Also keep minCount, the smallest count that exists.",
      "When a key is used, move it from the list of its count to the list of count + 1; if the old list is now empty and it was minCount, minCount goes up by one. When adding a new key, minCount becomes 1. To evict, take the key at the back of the list for minCount.",
    ],
    solution: {
      idea: [
        "Store each key's value, use count and its position in the list for that count. Keep one list of keys per count, ordered from most recently used (front) to least recently used (back), and the smallest count minCount.",
        "Using a key moves it to the front of the next count's list. If that empties the list for minCount, minCount grows by one. A new key goes to the list for count 1 and sets minCount to 1. Eviction removes the back key of the list for minCount, which is the least frequently used and, within that count, the least recently used.",
      ],
      complexity: "O(1) per call, O(capacity) space.",
      cpp: `class LFUCache {
    struct Entry {
        int value;
        int count;
        list<int>::iterator pos;
    };
    int cap, minCount = 0;
    unordered_map<int, Entry> entries;
    unordered_map<int, list<int>> byCount;  // keys with this use count, most recent first

    void touch(int key) {
        Entry& e = entries[key];
        list<int>& old = byCount[e.count];
        old.erase(e.pos);
        if (old.empty()) {
            byCount.erase(e.count);
            if (minCount == e.count) minCount++;
        }
        e.count++;
        byCount[e.count].push_front(key);
        e.pos = byCount[e.count].begin();
    }

public:
    LFUCache(int capacity) : cap(capacity) {}

    int get(int key) {
        if (!entries.count(key)) return -1;
        touch(key);
        return entries[key].value;
    }

    void put(int key, int value) {
        if (cap == 0) return;
        if (entries.count(key)) {
            entries[key].value = value;
            touch(key);
            return;
        }
        if ((int)entries.size() == cap) {
            list<int>& victims = byCount[minCount];
            entries.erase(victims.back());
            victims.pop_back();
            if (victims.empty()) byCount.erase(minCount);
        }
        byCount[1].push_front(key);
        entries[key] = {value, 1, byCount[1].begin()};
        minCount = 1;
    }
};
`,
    },
    stress: [
      {
        label: "200000 mixed calls, 3000 keys, capacity 1000",
        make: () => {
          const r = rng(460);
          const ops: string[] = ["LFUCache"];
          const args: unknown[][] = [[1000]];
          for (let i = 0; i < 200000; i++) {
            if (r() < 0.4) { ops.push("put"); args.push([between(r, 0, 2999), between(r, 0, 1000000000)]); }
            else { ops.push("get"); args.push([between(r, 0, 2999)]); }
          }
          return callList(ops, args);
        },
      },
    ],
  }),

  designProblem({
    id: "lc-208",
    title: "Implement Trie (Prefix Tree)",
    statement: [
      "Design a trie, a tree that stores words one letter per edge so that words sharing a start share a path.",
      "insert(word) adds the word. search(word) returns true only if exactly this word was inserted earlier. startsWith(prefix) returns true if some inserted word begins with prefix (a word is a prefix of itself).",
      CALLS,
    ],
    constraints: ["1 <= word.length, prefix.length <= 2000", "Words and prefixes use only the lowercase letters a to z", "At most 100000 calls in total"],
    design: {
      className: "Trie",
      ctor: [],
      methods: [
        { name: "insert", params: [{ name: "word", type: "string" }], returns: "void" },
        { name: "search", params: [{ name: "word", type: "string" }], returns: "bool" },
        { name: "startsWith", params: [{ name: "prefix", type: "string" }], returns: "bool" },
      ],
    },
    examples: [
      { ...seq('Trie() insert("apple") search("apple") search("app") startsWith("app") insert("app") search("app")', [null, null, true, false, true, null, true]), explanation: 'Only "apple" was inserted at first, so "app" is a prefix but not a word. After insert("app") it is a word too.' },
    ],
    tests: [
      seq('Trie() search("a") startsWith("a")', [null, false, false]),
      seq('Trie() insert("hello") insert("help") search("hel") startsWith("hel") search("help") search("helps") startsWith("helo")', [null, null, null, false, true, true, false, false]),
      seq('Trie() insert("cat") insert("car") insert("cart") search("car") search("cart") search("ca") startsWith("car") startsWith("cab")', [null, null, null, null, true, true, false, true, false]),
      seq('Trie() insert("a") insert("a") search("a") startsWith("a") search("aa")', [null, null, null, true, true, false]),
      seq('Trie() insert("abc") search("abd") startsWith("abd") search("ab") insert("ab") search("ab")', [null, null, false, false, false, null, true]),
      seq('Trie() insert("zebra") startsWith("z") startsWith("zebra") startsWith("zebras") search("zebra")', [null, null, true, true, false, true]),
    ],
    hints: [
      "Picture a tree where each edge is a letter. Walking down the letters of a word from the root either reaches a node or falls off the tree.",
      "Each node needs its children (26 slots, or a map from letter to node) and a flag that says a word ends here.",
      "search walks the letters and also needs the flag at the last node; startsWith only needs the walk to succeed.",
    ],
    solution: {
      idea: [
        "Each node has up to 26 children and a flag endsHere. insert walks from the root, creating missing children, and sets the flag on the last node.",
        "A helper walks the letters of a string and returns the node it reaches, or nothing if a child is missing. search is true when the helper reaches a node with the flag set. startsWith is true when the helper reaches any node.",
      ],
      complexity: "O(length of the word) per call; O(total letters) space.",
      cpp: `class Trie {
    struct Node {
        Node* next[26] = {};
        bool endsHere = false;
    };
    Node* root = new Node();

    Node* walk(const string& s) {
        Node* cur = root;
        for (char ch : s) {
            cur = cur->next[ch - 'a'];
            if (!cur) return nullptr;
        }
        return cur;
    }

public:
    Trie() {}

    void insert(string word) {
        Node* cur = root;
        for (char ch : word) {
            Node*& child = cur->next[ch - 'a'];
            if (!child) child = new Node();
            cur = child;
        }
        cur->endsHere = true;
    }

    bool search(string word) {
        Node* n = walk(word);
        return n && n->endsHere;
    }

    bool startsWith(string prefix) { return walk(prefix) != nullptr; }
};
`,
    },
    stress: [
      {
        label: "50000 inserts and 50000 lookups of words up to 40 letters",
        make: () => {
          const r = rng(208);
          const ops: string[] = ["Trie"];
          const args: unknown[][] = [[]];
          for (let i = 0; i < 50000; i++) { ops.push("insert"); args.push([letters(r, between(r, 5, 40), 3)]); }
          for (let i = 0; i < 50000; i++) { ops.push(r() < 0.5 ? "search" : "startsWith"); args.push([letters(r, between(r, 3, 40), 3)]); }
          return callList(ops, args);
        },
      },
    ],
  }),

  designProblem({
    id: "lc-211",
    title: "Design Add and Search Words Data Structure",
    statement: [
      "Design a dictionary that can add words and search for them, where a search word may contain the wildcard letter . (a dot) that matches any single letter.",
      "addWord(word) adds a word. search(word) returns true if some added word matches word: same length, and every letter equal except that a dot matches any letter.",
      CALLS,
    ],
    constraints: ["1 <= word.length <= 25", "addWord uses only the lowercase letters a to z; search may also use dots", "At most 2 dots in a searched word", "At most 50000 calls in total"],
    design: {
      className: "WordDictionary",
      ctor: [],
      methods: [
        { name: "addWord", params: [{ name: "word", type: "string" }], returns: "void" },
        { name: "search", params: [{ name: "word", type: "string" }], returns: "bool" },
      ],
    },
    examples: [
      { ...seq('WordDictionary() addWord("bad") addWord("dad") addWord("mad") search("pad") search("bad") search(".ad") search("b..")', [null, null, null, null, false, true, true, true]), explanation: '"pad" was never added. ".ad" matches "bad" (or "dad", "mad"), and "b.." matches "bad".' },
    ],
    tests: [
      seq('WordDictionary() search("a") search(".")', [null, false, false]),
      seq('WordDictionary() addWord("a") addWord("ab") search("a") search("a.") search("..") search(".") search("ab") search("b.")', [null, null, null, true, true, true, true, true, false]),
      seq('WordDictionary() addWord("at") addWord("and") addWord("an") addWord("add") search("a") search(".at") addWord("bat") search(".at") search("an.") search("a.d.") search("b.") search("a.d") search(".")', [null, null, null, null, null, false, false, null, true, true, false, false, true, false]),
      seq('WordDictionary() addWord("abc") search("abc") search("abcd") search("ab") search("...") search("a.c") search("..d")', [null, null, true, false, false, true, true, false]),
      seq('WordDictionary() addWord("aaa") addWord("aab") search("aa.") search("a.b") search(".ab") search("...") search("b..")', [null, null, null, true, true, true, true, false]),
      seq('WordDictionary() addWord("hello") search("h.llo") search("hell.") search("hell") search(".....") search("......")', [null, null, true, true, false, true, false]),
    ],
    hints: [
      "Without dots this is a trie. What changes when the next letter is a dot?",
      "At a dot you have to try every child of the current node, so the search becomes a depth-first search over the trie.",
      "Write search as a recursive function (node, position). At a normal letter follow one child; at a dot try all children and return true if any works. At the end of the word, return the node's end flag.",
    ],
    solution: {
      idea: [
        "Store the words in a trie with an end-of-word flag on each node.",
        "Searching goes letter by letter. A normal letter follows the one matching child (or fails). A dot tries every existing child in turn and succeeds if any of them leads to a match for the rest of the word. At the end of the word the answer is whether this node ends a word.",
        "With few dots the search is close to a normal trie walk. Each dot can multiply the work by up to 26, which is why the number of dots is limited.",
      ],
      complexity: "addWord O(length); search O(length) without dots and up to O(26^dots * length) with them.",
      cpp: `class WordDictionary {
    struct Node {
        Node* next[26] = {};
        bool endsHere = false;
    };
    Node* root = new Node();

    bool match(Node* node, const string& w, int i) {
        if (i == (int)w.size()) return node->endsHere;
        if (w[i] == '.') {
            for (Node* child : node->next)
                if (child && match(child, w, i + 1)) return true;
            return false;
        }
        Node* child = node->next[w[i] - 'a'];
        return child && match(child, w, i + 1);
    }

public:
    WordDictionary() {}

    void addWord(string word) {
        Node* cur = root;
        for (char ch : word) {
            Node*& child = cur->next[ch - 'a'];
            if (!child) child = new Node();
            cur = child;
        }
        cur->endsHere = true;
    }

    bool search(string word) { return match(root, word, 0); }
};
`,
    },
    stress: [
      {
        label: "30000 words of up to 25 letters, 20000 searches with dots",
        make: () => {
          const r = rng(211);
          const ops: string[] = ["WordDictionary"];
          const args: unknown[][] = [[]];
          const words: string[] = [];
          for (let i = 0; i < 30000; i++) { const w = letters(r, between(r, 3, 25), 6); words.push(w); ops.push("addWord"); args.push([w]); }
          for (let i = 0; i < 20000; i++) {
            const chars = (r() < 0.6 ? words[between(r, 0, words.length - 1)] : letters(r, between(r, 3, 25), 6)).split("");
            for (let d = between(r, 0, 2); d > 0; d--) chars[between(r, 0, chars.length - 1)] = ".";
            ops.push("search");
            args.push([chars.join("")]);
          }
          return callList(ops, args);
        },
      },
    ],
  }),

  designProblem({
    id: "lc-981",
    title: "Time Based Key-Value Store",
    statement: [
      "Design a store where each key can hold different values at different times.",
      "set(key, value, timestamp) stores value for key at that time. get(key, timestamp) returns the value stored for key at the latest time that is not after timestamp, or an empty string if the key has no value at or before timestamp.",
      "For a given key, the timestamps passed to set are strictly increasing.",
      CALLS,
    ],
    constraints: ["1 <= key.length, value.length <= 100", "Keys and values use lowercase letters and digits", "1 <= timestamp <= 10000000", "At most 200000 calls in total"],
    design: {
      className: "TimeMap",
      ctor: [],
      methods: [
        { name: "set", params: [{ name: "key", type: "string" }, { name: "value", type: "string" }, { name: "timestamp", type: "int" }], returns: "void" },
        { name: "get", params: [{ name: "key", type: "string" }, { name: "timestamp", type: "int" }], returns: "string" },
      ],
    },
    examples: [
      { ...seq('TimeMap() set("foo","bar",1) get("foo",1) get("foo",3) set("foo","bar2",4) get("foo",4) get("foo",5)', [null, null, "bar", "bar", null, "bar2", "bar2"]), explanation: 'At time 3 the latest value at or before 3 is "bar" (time 1).' },
    ],
    tests: [
      seq('TimeMap() get("a",1) set("a","x",5) get("a",4) get("a",5) get("a",6)', [null, "", null, "", "x", "x"]),
      seq('TimeMap() set("love","high",10) set("love","low",20) get("love",5) get("love",10) get("love",15) get("love",20) get("love",25)', [null, null, null, "", "high", "high", "low", "low"]),
      seq('TimeMap() set("a","1",1) set("b","2",2) set("a","3",3) get("a",2) get("b",2) get("b",1) get("a",3) get("c",3)', [null, null, null, null, "1", "2", "", "3", ""]),
      seq('TimeMap() set("k","v1",100) set("k","v2",200) set("k","v3",300) get("k",250) get("k",300) get("k",99) get("k",1000)', [null, null, null, null, "v2", "v3", "", "v3"]),
      seq('TimeMap() set("x","a",1) get("x",1) set("x","b",2) get("x",1) get("x",2)', [null, null, "a", null, "a", "b"]),
      seq('TimeMap() set("p","q",1000000) get("p",1000000) get("p",999999) get("p",10000000)', [null, null, "q", "", "q"]),
    ],
    hints: [
      "For one key you have a list of (timestamp, value) pairs. Because set is called with increasing timestamps, the list is already sorted by time.",
      "Keep a hash map from key to that list. get is then a search in a sorted list.",
      "Binary search for the last pair whose timestamp is at most the asked one. If there is none, return the empty string.",
    ],
    solution: {
      idea: [
        "Map each key to a vector of (timestamp, value) pairs. set appends, which keeps each vector sorted because timestamps for a key only grow.",
        "get finds the key's vector, then binary searches for the first pair with a timestamp greater than the asked one; the pair just before it is the answer, or the empty string if it is the first.",
      ],
      complexity: "set O(1); get O(log n) where n is the number of values stored for the key.",
      cpp: `class TimeMap {
    unordered_map<string, vector<pair<int, string>>> data;

public:
    TimeMap() {}

    void set(string key, string value, int timestamp) {
        data[key].push_back({timestamp, value});
    }

    string get(string key, int timestamp) {
        auto it = data.find(key);
        if (it == data.end()) return "";
        auto& v = it->second;
        int lo = 0, hi = v.size();  // first position with a time after the asked one
        while (lo < hi) {
            int mid = (lo + hi) / 2;
            if (v[mid].first <= timestamp) lo = mid + 1;
            else hi = mid;
        }
        return lo == 0 ? "" : v[lo - 1].second;
    }
};
`,
    },
    stress: [
      {
        label: "100000 sets over 100 keys, then 100000 gets",
        make: () => {
          const r = rng(981);
          const ops: string[] = ["TimeMap"];
          const args: unknown[][] = [[]];
          const clock = new Array<number>(100).fill(0);
          for (let i = 0; i < 100000; i++) {
            const k = between(r, 0, 99);
            clock[k] += between(r, 1, 50);
            ops.push("set");
            args.push([`key${k}`, letters(r, 8, 26), clock[k]]);
          }
          for (let i = 0; i < 100000; i++) { ops.push("get"); args.push([`key${between(r, 0, 99)}`, between(r, 1, 2600000)]); }
          return callList(ops, args);
        },
      },
    ],
  }),
];
