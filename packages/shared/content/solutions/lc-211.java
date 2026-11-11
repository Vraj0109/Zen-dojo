class WordDictionary {
    private static class Node {
        Node[] next = new Node[26];
        boolean endsHere = false;
    }
    private final Node root = new Node();

    private boolean match(Node node, String w, int i) {
        if (i == w.length()) return node.endsHere;
        char ch = w.charAt(i);
        if (ch == '.') {
            for (Node child : node.next) {
                if (child != null && match(child, w, i + 1)) return true;
            }
            return false;
        }
        Node child = node.next[ch - 'a'];
        return child != null && match(child, w, i + 1);
    }

    public WordDictionary() {}

    public void addWord(String word) {
        Node cur = root;
        for (int i = 0; i < word.length(); i++) {
            int idx = word.charAt(i) - 'a';
            if (cur.next[idx] == null) cur.next[idx] = new Node();
            cur = cur.next[idx];
        }
        cur.endsHere = true;
    }

    public boolean search(String word) {
        return match(root, word, 0);
    }
}
