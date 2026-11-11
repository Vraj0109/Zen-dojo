class Solution {
    public int[] permutations(int n) {
        if (n == 1) return new int[] {1};
        if (n == 2 || n == 3) return new int[0];
        int[] out = new int[n];
        int idx = 0;
        for (int i = 2; i <= n; i += 2) out[idx++] = i;
        for (int i = 1; i <= n; i += 2) out[idx++] = i;
        return out;
    }
}
