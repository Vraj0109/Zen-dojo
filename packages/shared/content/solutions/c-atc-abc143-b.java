class Solution {
    public int pairProductSum(int[] d) {
        int sum = 0, squares = 0;
        for (int x : d) {
            sum += x;
            squares += x * x;
        }
        return (sum * sum - squares) / 2;
    }
}
