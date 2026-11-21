import java.util.*;

class Solution {
    public int[][] towerOfHanoi(int n) {
        List<int[]> moves = new ArrayList<>();
        hanoi(n, 1, 3, 2, moves);
        int[][] res = new int[moves.size()][2];
        for (int i = 0; i < moves.size(); i++) {
            res[i] = moves.get(i);
        }
        return res;
    }

    private void hanoi(int n, int from, int to, int aux, List<int[]> moves) {
        if (n == 0) return;
        hanoi(n - 1, from, aux, to, moves);
        moves.add(new int[]{from, to});
        hanoi(n - 1, aux, to, from, moves);
    }
}
