class Solution {
    public int maximizeExpression(int a, int b, int c) {
        int v1 = a + b + c;
        int v2 = a * b * c;
        int v3 = (a + b) * c;
        int v4 = a * (b + c);
        int v5 = a + b * c;
        int v6 = a * b + c;
        return Math.max(v1, Math.max(v2, Math.max(v3, Math.max(v4, Math.max(v5, v6)))));
    }
}
