class Solution {
    public String diceGameWinner(int[][] rounds) {
        int mWins = 0, cWins = 0;
        for (int[] r : rounds) {
            if (r[0] > r[1]) mWins++;
            else if (r[1] > r[0]) cWins++;
        }
        if (mWins > cWins) return "Mishka";
        if (cWins > mWins) return "Chris";
        return "Friendship is magic!^^";
    }
}
