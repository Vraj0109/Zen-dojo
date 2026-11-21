import java.util.*;

class Solution {
    private int evaluateSimple(String s) {
        Deque<Long> nums = new ArrayDeque<>();
        long cur = 0;
        char sign = '+';
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isDigit(c)) {
                cur = cur * 10 + (c - '0');
            }
            if ((!Character.isDigit(c) && c != ' ') || i + 1 == s.length()) {
                if (sign == '+') nums.push(cur);
                else if (sign == '-') nums.push(-cur);
                else if (sign == '*') nums.push(nums.pop() * cur);
                else if (sign == '/') nums.push(nums.pop() / cur);
                sign = c;
                cur = 0;
            }
        }
        long sum = 0;
        for (long x : nums) sum += x;
        return (int) sum;
    }

    public int calculate(String s) {
        while (true) {
            int right = s.indexOf(')');
            if (right == -1) break;
            int left = right;
            while (left >= 0 && s.charAt(left) != '(') left--;
            String inner = s.substring(left + 1, right);
            int val = evaluateSimple(inner);
            s = s.substring(0, left) + val + s.substring(right + 1);
        }
        return evaluateSimple(s);
    }
}
