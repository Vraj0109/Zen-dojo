class Solution {
    public boolean[] checkMatchesFit(int w, int h, int[] matches) {
        int maxSq = w * w + h * h;
        boolean[] ans = new boolean[matches.length];
        for (int i = 0; i < matches.length; i++) {
            ans[i] = (matches[i] * matches[i] <= maxSq);
        }
        return ans;
    }
}
