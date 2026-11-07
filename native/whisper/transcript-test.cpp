#include "transcript.h"
#include <stdexcept>
#include <iostream>
static void require(bool value) {if (!value) throw std::runtime_error("Transcript regression check failed");}
int main() {
    Transcript t;
    require(!t.update(1, "And so my", false));
    require(t.update(1, "And so my fellow Americans", false)->text == "And so my");
    require(t.update(1, "And so my fellow Americans ask not", false)->text == "And so my fellow Americans");
    require(t.update(1, "And so my fellow Americans ask not what your country can do for you", true)->text == "And so my fellow Americans ask not what your country can do for you");
    Transcript numbers;
    require(!numbers.update(1, "one", false));
    require(numbers.update(1, "one zero", false)->text == "one");
    numbers.update(1, "10001", false);
    require(numbers.update(1, "10001 90210", false)->text == "10001");
    require(numbers.update(1, "10001 90210 01803", true)->text == "10001 90210 01803");
    Transcript repeated;
    repeated.update(1,"yes",true);
    require(repeated.update(2,"yes",true)->text == "yes yes");
    require(repeated.update(3,"yes next",true,true)->text == "yes yes next");
    Transcript rolling(8);
    rolling.update(1,"one two three four five six",true);
    const auto result=rolling.update(2,"seven eight nine ten",true);
    require(result->text == "three four five six seven eight nine ten");
    require(result->word_offset == 2 && result->utterance_start == 6);
    Transcript noise;
    require(!noise.update(1,"lock lock lock lock lock lock lock lock lock lock lock lock lock lock lock lock lock lock",true));
    std::cout << "PASS: streaming agreement, numeric revisions, overlap, rolling offsets, and repetition rejection\n";
}
