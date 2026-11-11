class Trie {
    private static class Node {
        Node[] next = new Node[26];
        boolean endsHere = false;
    }
    private final Node root = new Node();

    private Node walk(String s) {
        Node cur = root;
        for (int i = 0; i < s.length(); i++) {
            cur = cur.next[s.charAt(i) - 'a'];
            if (cur == null) return null;
        }
        return cur;
    }

    public Trie() {}

    public void insert(String word) {
        Node cur = root;
        for (int i = 0; i < word.length(); i++) {
            int idx = word.charAt(i) - 'a';
            if (cur.next[idx] == null) cur.next[idx] = new Node();
            cur = cur.next[idx];
        }
        cur.endsHere = true;
    }

    public boolean search(String word) {
        Node n = walk(word);
        return n != null && n.endsHere;
    }

    public boolean startsWith(String prefix) {
        return walk(prefix) != null;
    }
}
