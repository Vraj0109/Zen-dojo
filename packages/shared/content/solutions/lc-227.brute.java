import java.util.*;

class Solution {
    public int calculate(String s) {
        List<Integer> vals = new ArrayList<>();
        List<Character> ops = new ArrayList<>();
        int cur = 0;
        boolean hasNum = false;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isDigit(c)) {
                cur = cur * 10 + (c - '0');
                hasNum = true;
            } else if (c == '+' || c == '-' || c == '*' || c == '/') {
                vals.add(cur);
                cur = 0;
                hasNum = false;
                ops.add(c);
            }
        }
        if (hasNum) vals.add(cur);

        List<Integer> nextVals = new ArrayList<>();
        List<Character> nextOps = new ArrayList<>();
        nextVals.add(vals.get(0));
        for (int i = 0; i < ops.size(); i++) {
            char op = ops.get(i);
            int nextVal = vals.get(i + 1);
            if (op == '*') {
                int lastIdx = nextVals.size() - 1;
                nextVals.set(lastIdx, nextVals.get(lastIdx) * nextVal);
            } else if (op == '/') {
                int lastIdx = nextVals.size() - 1;
                nextVals.set(lastIdx, nextVals.get(lastIdx) / nextVal);
            } else {
                nextOps.add(op);
                nextVals.add(nextVal);
            }
        }

        int res = nextVals.get(0);
        for (int i = 0; i < nextOps.size(); i++) {
            if (nextOps.get(i) == '+') res += nextVals.get(i + 1);
            else res -= nextVals.get(i + 1);
        }
        return res;
    }
}
