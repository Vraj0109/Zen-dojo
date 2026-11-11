class Solution {
    public String hulkFeelings(int n) {
        StringBuilder res = new StringBuilder();
        for (int i = 1; i <= n; i++) {
            if (i > 1) res.append(" that ");
            if (i % 2 == 1) res.append("I hate");
            else res.append("I love");
        }
        res.append(" it");
        return res.toString();
    }
}
