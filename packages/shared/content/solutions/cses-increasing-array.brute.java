class Solution {
    public long increasingArray(long[] x) {
        long moves = 0;
        long[] arr = x.clone();
        for (int i = 1; i < arr.length; i++) {
            long diff = arr[i - 1] - arr[i];
            if (diff > 0) {
                moves += diff;
                arr[i] = arr[i - 1];
            }
        }
        return moves;
    }
}
