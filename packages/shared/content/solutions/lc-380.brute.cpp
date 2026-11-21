#include <vector>
#include <algorithm>
#include <cstdlib>

using namespace std;

class RandomizedSet {
    vector<int> items;

public:
    RandomizedSet() {}

    bool insert(int val) {
        for (int x : items) {
            if (x == val) return false;
        }
        items.push_back(val);
        return true;
    }

    bool remove(int val) {
        for (auto it = items.begin(); it != items.end(); ++it) {
            if (*it == val) {
                items.erase(it);
                return true;
            }
        }
        return false;
    }

    int getRandom() {
        return items[rand() % items.size()];
    }
};
