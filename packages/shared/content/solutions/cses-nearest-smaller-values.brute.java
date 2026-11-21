class Solution {
    public int[] nearestSmallerValues(int[] arr) {
        int n = arr.length;
        int[] ans = new int[n];
        for (int i = 0; i < n; i++) {
            for (int j = i - 1; j >= 0; j--) {
                if (arr[j] < arr[i]) {
                    ans[i] = j + 1;
                    break;
                }
            }
        }
        return ans;
    }
}
