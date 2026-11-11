import java.util.*;

class Solution {
    public int playlist(int[] songs) {
        Map<Integer, Integer> lastPos = new HashMap<>();
        int left = 0, best = 0;
        for (int right = 0; right < songs.length; right++) {
            Integer pos = lastPos.get(songs[right]);
            if (pos != null && pos >= left) {
                left = pos + 1;
            }
            lastPos.put(songs[right], right);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
