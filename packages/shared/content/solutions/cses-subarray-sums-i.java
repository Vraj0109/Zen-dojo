class Solution {
    public int subarraySumsI(int[] arr, int target) {
        int l = 0, count = 0;
        long sum = 0;
        for (int r = 0; r < arr.length; r++) {
            sum += arr[r];
            while (sum > target && l <= r) {
                sum -= arr[l++];
            }
            if (sum == target) count++;
        }
        return count;
    }
}
