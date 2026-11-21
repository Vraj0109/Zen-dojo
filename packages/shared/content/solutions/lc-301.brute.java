import java.util.*;

public class Solution {
    private boolean isValid(String s) {
        int bal = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '(') bal++;
            else if (c == ')') {
                bal--;
                if (bal < 0) return false;
            }
        }
        return bal == 0;
    }

    public String[] removeInvalidParentheses(String s) {
        List<String> result = new ArrayList<>();
        Set<String> visited = new HashSet<>();
        Queue<String> q = new LinkedList<>();

        q.offer(s);
        visited.add(s);
        boolean found = false;

        while (!q.isEmpty()) {
            int sz = q.size();
            for (int i = 0; i < sz; i++) {
                String cur = q.poll();

                if (isValid(cur)) {
                    result.add(cur);
                    found = true;
                }

                if (found) continue;

                for (int j = 0; j < cur.length(); j++) {
                    char c = cur.charAt(j);
                    if (c != '(' && c != ')') continue;
                    String next = cur.substring(0, j) + cur.substring(j + 1);
                    if (visited.add(next)) {
                        q.offer(next);
                    }
                }
            }
            if (found) break;
        }

        if (result.isEmpty()) return new String[]{""};
        return result.toArray(new String[0]);
    }
}
