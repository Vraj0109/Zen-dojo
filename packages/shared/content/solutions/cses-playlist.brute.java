import java.util.*;

class Solution {
    public int playlist(int[] songs) {
        Map<Integer, Integer> lastPos = new HashMap<>();
        int left = 0, best = 0;
        for (int right = 0; right < songs.length; right++) {
            Integer prev = lastPos.get(songs[right]);
            if (prev != null && prev >= left) {
                left = prev + 1;
            }
            lastPos.put(songs[right], right);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
