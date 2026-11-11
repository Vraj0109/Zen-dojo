import java.util.ArrayList;
import java.util.List;

class Solution {
    private static class Node {
        int[] next = new int[26];
        boolean isEnd = false;
    }

    public int wordCombinations(String s, String[] words) {
        List<Node> trie = new ArrayList<>();
        trie.add(new Node());

        for (String w : words) {
            int cur = 0;
            for (int i = 0; i < w.length(); i++) {
                int idx = w.charAt(i) - 'a';
                if (trie.get(cur).next[idx] == 0) {
                    trie.get(cur).next[idx] = trie.size();
                    trie.add(new Node());
                }
                cur = trie.get(cur).next[idx];
            }
            trie.get(cur).isEnd = true;
        }

        int n = s.length();
        int MOD = 1000000007;
        int[] dp = new int[n + 1];
        dp[0] = 1;

        for (int i = 0; i < n; i++) {
            if (dp[i] == 0) continue;
            int cur = 0;
            for (int j = i; j < n; j++) {
                int idx = s.charAt(j) - 'a';
                if (trie.get(cur).next[idx] == 0) break;
                cur = trie.get(cur).next[idx];
                if (trie.get(cur).isEnd) {
                    dp[j + 1] = (dp[j + 1] + dp[i]) % MOD;
                }
            }
        }

        return dp[n];
    }
}
