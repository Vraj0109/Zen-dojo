class Solution {
    public int calculate(String s) {
        long total = 0, last = 0, cur = 0;
        char op = '+';
        for (int i = 0; i <= s.length(); i++) {
            char c = i < s.length() ? s.charAt(i) : '+';
            if (Character.isDigit(c)) {
                cur = cur * 10 + (c - '0');
                continue;
            }
            if (c == ' ') continue;
            if (op == '+') { total += last; last = cur; }
            else if (op == '-') { total += last; last = -cur; }
            else if (op == '*') { last *= cur; }
            else { last /= cur; }
            op = c;
            cur = 0;
        }
        return (int) (total + last);
    }
}