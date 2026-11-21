#include <string>
#include <vector>
#include <algorithm>

using namespace std;

class Trie {
    vector<string> words;

public:
    Trie() {}

    void insert(string word) {
        words.push_back(word);
    }

    bool search(string word) {
        for (const string& w : words) {
            if (w == word) return true;
        }
        return false;
    }

    bool startsWith(string prefix) {
        for (const string& w : words) {
            if (w.rfind(prefix, 0) == 0) return true;
        }
        return false;
    }
};
