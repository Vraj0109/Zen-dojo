import java.util.*;

class Solution {
    public int ladderLength(String beginWord, String endWord, String[] wordList) {
        Set<String> dict = new HashSet<>(Arrays.asList(wordList));
        if (!dict.contains(endWord)) return 0;
        Queue<String> q = new ArrayDeque<>();
        Queue<Integer> dq = new ArrayDeque<>();
        q.offer(beginWord);
        dq.offer(1);
        dict.remove(beginWord);
        while (!q.isEmpty()) {
            String w = q.poll();
            int d = dq.poll();
            if (w.equals(endWord)) return d;
            char[] arr = w.toCharArray();
            for (int i = 0; i < arr.length; i++) {
                char orig = arr[i];
                for (char ch = 'a'; ch <= 'z'; ch++) {
                    if (ch == orig) continue;
                    arr[i] = ch;
                    String next = new String(arr);
                    if (dict.contains(next)) {
                        dict.remove(next);
                        q.offer(next);
                        dq.offer(d + 1);
                    }
                }
                arr[i] = orig;
            }
        }
        return 0;
    }
}