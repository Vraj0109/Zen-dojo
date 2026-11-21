import java.util.Arrays;

class Solution {
    public int[] movieFestivalQueries(int[][] movies, int[][] queries) {
        int[][] mv = new int[movies.length][2];
        for (int i = 0; i < movies.length; i++) {
            mv[i][0] = movies[i][1]; // end
            mv[i][1] = movies[i][0]; // start
        }
        Arrays.sort(mv, (x, y) -> Integer.compare(x[0], y[0]));
        int[] ans = new int[queries.length];
        for (int q = 0; q < queries.length; q++) {
            int a = queries[q][0], b = queries[q][1];
            int count = 0, lastEnd = a;
            for (int[] m : mv) {
                int end = m[0];
                int start = m[1];
                if (start >= lastEnd && end <= b) {
                    count++;
                    lastEnd = end;
                }
            }
            ans[q] = count;
        }
        return ans;
    }
}
