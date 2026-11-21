import java.util.*;

class WordDictionary {
    private final List<String> words = new ArrayList<>();

    public WordDictionary() {}

    public void addWord(String word) {
        words.add(word);
    }

    public boolean search(String word) {
        int n = word.length();
        for (String w : words) {
            if (w.length() != n) continue;
            boolean ok = true;
            for (int i = 0; i < n; i++) {
                char c = word.charAt(i);
                if (c != '.' && c != w.charAt(i)) {
                    ok = false;
                    break;
                }
            }
            if (ok) return true;
        }
        return false;
    }
}
