import java.util.*;

class Solution {
    public String decodeString(String s) {
        Deque<String> strSt = new ArrayDeque<>();
        Deque<Integer> numSt = new ArrayDeque<>();
        StringBuilder cur = new StringBuilder();
        int num = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isDigit(c)) {
                num = num * 10 + (c - '0');
            } else if (c == '[') {
                strSt.push(cur.toString());
                numSt.push(num);
                cur.setLength(0);
                num = 0;
            } else if (c == ']') {
                String prev = strSt.pop();
                int k = numSt.pop();
                StringBuilder rep = new StringBuilder();
                for (int j = 0; j < k; j++) rep.append(cur);
                cur = new StringBuilder(prev).append(rep);
            } else {
                cur.append(c);
            }
        }
        return cur.toString();
    }
}