import java.util.*;

class Solution {
    private boolean diffOne(String a, String b) {
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            if (a.charAt(i) != b.charAt(i)) {
                diff++;
                if (diff > 1) return false;
            }
        }
        return diff == 1;
    }

    public int ladderLength(String beginWord, String endWord, String[] wordList) {
        Set<String> dict = new HashSet<>(Arrays.asList(wordList));
        if (!dict.contains(endWord)) return 0;

        List<String> allWords = new ArrayList<>();
        allWords.add(beginWord);
        for (String w : wordList) {
            if (!w.equals(beginWord)) allWords.add(w);
        }

        int n = allWords.size();
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (diffOne(allWords.get(i), allWords.get(j))) {
                    adj.get(i).add(j);
                    adj.get(j).add(i);
                }
            }
        }

        Queue<Integer> q = new LinkedList<>();
        int[] dist = new int[n];
        Arrays.fill(dist, -1);
        q.add(0);
        dist[0] = 1;
        while (!q.isEmpty()) {
            int u = q.poll();
            if (allWords.get(u).equals(endWord)) return dist[u];
            for (int v : adj.get(u)) {
                if (dist[v] == -1) {
                    dist[v] = dist[u] + 1;
                    q.add(v);
                }
            }
        }
        return 0;
    }
}
