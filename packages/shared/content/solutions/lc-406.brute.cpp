#include <vector>

using namespace std;

class Solution {
public:
    vector<vector<int>> reconstructQueue(vector<vector<int>>& people) {
        int n = people.size();
        vector<vector<int>> res(n);
        vector<bool> occupied(n, false);
        // Sort ascending by height, ties descending by k
        vector<vector<int>> p = people;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (p[i][0] > p[j][0] || (p[i][0] == p[j][0] && p[i][1] < p[j][1])) {
                    swap(p[i], p[j]);
                }
            }
        }
        for (const auto& person : p) {
            int h = person[0], k = person[1];
            int count = 0;
            for (int i = 0; i < n; i++) {
                if (!occupied[i]) {
                    if (count == k) {
                        res[i] = person;
                        occupied[i] = true;
                        break;
                    }
                    count++;
                }
            }
        }
        return res;
    }
};
