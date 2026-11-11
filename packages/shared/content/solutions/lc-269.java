import java.util.*;

class Solution {
    public String alienOrder(String[] words) {
        Set<Character> allChars = new HashSet<>();
        for (String w : words) {
            for (char c : w.toCharArray()) allChars.add(c);
        }

        Map<Character, Set<Character>> adj = new HashMap<>();
        Map<Character, Integer> inDegree = new HashMap<>();
        for (char c : allChars) inDegree.put(c, 0);

        for (int i = 0; i + 1 < words.length; i++) {
            String w1 = words[i], w2 = words[i + 1];
            if (w1.length() > w2.length() && w1.startsWith(w2)) return "";
            int minLen = Math.min(w1.length(), w2.length());
            for (int j = 0; j < minLen; j++) {
                if (w1.charAt(j) != w2.charAt(j)) {
                    adj.putIfAbsent(w1.charAt(j), new HashSet<>());
                    if (!adj.get(w1.charAt(j)).contains(w2.charAt(j))) {
                        adj.get(w1.charAt(j)).add(w2.charAt(j));
                        inDegree.put(w2.charAt(j), inDegree.get(w2.charAt(j)) + 1);
                    }
                    break;
                }
            }
        }

        PriorityQueue<Character> pq = new PriorityQueue<>();
        for (char c : allChars) {
            if (inDegree.get(c) == 0) pq.add(c);
        }

        StringBuilder order = new StringBuilder();
        while (!pq.isEmpty()) {
            char u = pq.poll();
            order.append(u);
            if (adj.containsKey(u)) {
                for (char v : adj.get(u)) {
                    inDegree.put(v, inDegree.get(v) - 1);
                    if (inDegree.get(v) == 0) pq.add(v);
                }
            }
        }

        if (order.length() < allChars.size()) return "";
        return order.toString();
    }
}
