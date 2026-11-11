class Solution {
    public int countTriangles(int[] l) {
        int n = l.length, count = 0;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                for (int k = j + 1; k < n; k++) {
                    long a = l[i], b = l[j], c = l[k];
                    if (a == b || b == c || a == c) continue;
                    long mx = Math.max(a, Math.max(b, c));
                    if (mx < a + b + c - mx) count++;
                }
            }
        }
        return count;
    }
}
