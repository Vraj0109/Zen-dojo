class Solution {
    private int i = 0;

    private int evaluateHelper(String s) {
        long res = 0, num = 0;
        int sign = 1;
        while (i < s.length()) {
            char c = s.charAt(i++);
            if (Character.isDigit(c)) {
                num = num * 10 + (c - '0');
            } else if (c == '(') {
                num = evaluateHelper(s);
            } else if (c == ')') {
                res += sign * num;
                return (int)res;
            } else if (c == '+' || c == '-') {
                res += sign * num;
                num = 0;
                sign = (c == '+') ? 1 : -1;
            }
        }
        res += sign * num;
        return (int)res;
    }

    public int calculate(String s) {
        i = 0;
        return evaluateHelper(s);
    }
}
