class Solution {
    public int collectingNumbers(int[] arr) {
        int n = arr.length;
        int[] pos = new int[n + 1];
        for (int i = 0; i < n; i++) {
            pos[arr[i]] = i;
        }
        int rounds = 1;
        for (int x = 2; x <= n; x++) {
            if (pos[x] < pos[x - 1]) rounds++;
        }
        return rounds;
    }
}
