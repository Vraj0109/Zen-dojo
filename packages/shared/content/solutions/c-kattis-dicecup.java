class Solution {
    public int[] mostLikelyDiceSums(int n, int m) {
        int lo = Math.min(n, m) + 1;
        int hi = Math.max(n, m) + 1;
        int[] ans = new int[hi - lo + 1];
        for (int s = lo; s <= hi; s++) {
            ans[s - lo] = s;
        }
        return ans;
    }
}
