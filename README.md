# yabl - yet another build library

Pronounced 'yabble'.

## What is this?

It's an experimental, work-in-progress, so-far-completely-unusable general-purpose build tool. Basically I'm just squatting on the name - unbelievably, 'yabl' is the best one I could come up with that wasn't already taken (usually by some long-forgotten 10 line module. npm really should get a grip of this).

# Why another build tool?

There's been a huge amount of innovation in build tools recently. A lot of us have moved away from the Grunt Way - of gluing together the various stages of a build process via increasingly-lazily-named temporary folders, re-executing the whole thing whenever source files change - towards smarter systems that understand *dependency graphs*. This means faster, smarter incremental rebuilds. My personal tool of choice is broccoli.

But personally I've been a little frustrated with some of the API choices made by these tools. Here's the thing: for any moderately complex build process, you're inevitably going to have needs that aren't met by existing plugins. Creating your own plugin needs to be effortless, and at the moment it's really, really not.

yabl will change all that. You're going to love it. If I can get it to work. Stay tuned.
