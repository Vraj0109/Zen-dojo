import java.util.*;

class Solution {
    public int calculate(String s) {
        long res = 0, num = 0;
        int sign = 1;
        Deque<Long> st = new ArrayDeque<>();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isDigit(c)) {
                num = num * 10 + (c - '0');
            } else if (c == '+' || c == '-') {
                res += sign * num;
                num = 0;
                sign = (c == '+') ? 1 : -1;
            } else if (c == '(') {
                st.push(res);
                st.push((long) sign);
                res = 0;
                sign = 1;
            } else if (c == ')') {
                res += sign * num;
                num = 0;
                long s2 = st.pop();
                long prev = st.pop();
                res = prev + s2 * res;
                sign = 1;
            }
        }
        res += sign * num;
        return (int) res;
    }
}