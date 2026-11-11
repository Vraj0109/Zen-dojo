import java.util.*;

class Solution {
    public int[] trafficLights(int streetLength, int[] positions) {
        TreeSet<Integer> lights = new TreeSet<>();
        lights.add(0);
        lights.add(streetLength);
        TreeMap<Integer, Integer> lens = new TreeMap<>();
        lens.put(streetLength, 1);

        int[] ans = new int[positions.length];
        for (int i = 0; i < positions.length; i++) {
            int p = positions[i];
            int r = lights.higher(p);
            int l = lights.lower(p);
            int oldLen = r - l;
            int count = lens.get(oldLen);
            if (count == 1) {
                lens.remove(oldLen);
            } else {
                lens.put(oldLen, count - 1);
            }
            lens.put(p - l, lens.getOrDefault(p - l, 0) + 1);
            lens.put(r - p, lens.getOrDefault(r - p, 0) + 1);
            lights.add(p);
            ans[i] = lens.lastKey();
        }
        return ans;
    }
}
