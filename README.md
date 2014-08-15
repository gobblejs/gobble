# gobble

**the last build tool you'll ever need**

Gobble an experimental, work-in-progress, so-far-completely-unusable general-purpose build tool. Basically I'm just squatting on the name But watch this space.

# Why another build tool?

There's been a huge amount of innovation in build tools recently. A lot of us have moved away from the Grunt Way - of gluing together the various stages of a build process via increasingly-lazily-named temporary folders, re-executing the whole thing whenever source files change - towards smarter systems that understand *dependency graphs*. This means faster, smarter incremental rebuilds. My personal tool of choice is broccoli.

But personally I've been a little frustrated with some of the API choices made by these tools. Here's the thing: for any moderately complex build process, you're inevitably going to have needs that aren't met by existing plugins. Creating your own plugin needs to be effortless, and at the moment it's really, really not.

And even if your needs *are* met by plugins, suddenly you're dependent on an ecosystem built by people who, in many cases, have better things to do than keep their stuff up to date.

Gobble will change all that. You're going to love it. If I can get it to work. Stay tuned.
