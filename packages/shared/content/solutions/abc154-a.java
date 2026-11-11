class Solution {
    public int[] remainingBalls(String s, String t, int a, int b, String u) {
        if (u.equals(s)) a--;
        else b--;
        return new int[]{a, b};
    }
}
