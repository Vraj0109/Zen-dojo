import java.util.*;

class Solution {
    private int parse(String s, int[] idx) {
        Deque<Long> nums = new ArrayDeque<>();
        char op = '+';
        long cur = 0;
        while (idx[0] < s.length()) {
            char c = s.charAt(idx[0]++);
            if (Character.isDigit(c)) {
                cur = cur * 10 + (c - '0');
            } else if (c == '(') {
                cur = parse(s, idx);
            }
            if ((!Character.isDigit(c) && c != ' ') || idx[0] == s.length()) {
                if (op == '+') nums.push(cur);
                else if (op == '-') nums.push(-cur);
                else if (op == '*') {
                    long top = nums.pop();
                    nums.push(top * cur);
                } else if (op == '/') {
                    long top = nums.pop();
                    nums.push(top / cur);
                }
                op = c;
                cur = 0;
            }
            if (c == ')') break;
        }
        long sum = 0;
        for (long x : nums) sum += x;
        return (int) sum;
    }

    public int calculate(String s) {
        int[] idx = {0};
        return parse(s, idx);
    }
}
