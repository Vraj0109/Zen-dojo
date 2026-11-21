class Solution {
    public int[] sumOfThreeValues(int[] arr, int target) {
        int n = arr.length;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                for (int k = j + 1; k < n; k++) {
                    if ((long) arr[i] + arr[j] + arr[k] == target) {
                        return new int[]{i + 1, j + 1, k + 1};
                    }
                }
            }
        }
        return new int[]{-1, -1, -1};
    }
}
