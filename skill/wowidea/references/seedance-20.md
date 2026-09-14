# Seedance 2.0 prompt writing

For 2.0 and separately routed fast/mini variants. Official creative guidance takes precedence over community surface assumptions. Selected craft rules adapt the installed MIT Seedance prompt Skill by Iamemily2050; retain [its notice](seedance-MIT.txt). See [source snapshots](sources.md). This is not the 2.5 guide.

## Compile a shooting brief

Choose the operation and visible intention first. Use **Subject + Action + Scene + Camera + Lighting/Style + Audio + Constraints** as a flexible container, not compulsory decoration. Put the subject and principal change early. Let camera, performance, light and sound serve the intent. For reference images, avoid redundantly rewriting the still; specify the dynamics and allowed changes it cannot show.

A useful action chain is initial state → trigger → visible change → response → follow-through → endpoint. Separate object, actor, camera and environment movement. Describe delayed fabric motion or inertia when relevant, not as a universal realism requirement. Intentional surreal deformation remains valid.

## Operation-specific writing

| Operation | Write | Avoid |
| --- | --- | --- |
| Text-only | Establish subject, setting, action and resulting state | A stack of unrelated events |
| Strict first frame | Begin at the actual image state; describe motion and continuity locks | Rebuilding the image as a different composition |
| First/last frames | Identify both endpoints and the continuous path between them | Treating the last frame as mood only |
| Multimodal reference | Assign identity, motion, camera, environment, style and audio roles explicitly | Importing the source actor or soundtrack from a motion-only video |
| Edit | Identify the source video, affected region/time and A→B change; preserve the rest | Calling an edit merely a reference generation |
| Extend | Specify prepend/append, the observed boundary state and the new event | Inventing the previous ending or repeating a completed action |

Assign stable subject descriptions and two or three useful identity anchors. Each controlled dimension needs an unambiguous reference authority. Resolve conflicting references; do not silently drop an approved asset. Keep image/video/audio numbering aligned with the approved arrays. Use the exact binding syntax verified for the current EasyAI route; community `@Image1` and Flova `<<<image_1>>>` are not universal API tokens.

For complex clips use ordered shots. State each cut's reason and spatial/action handoff. Do not promise precise second-by-second timing for 2.0. A short clip usually benefits from one readable change; this is guidance, not a restriction against user-requested complex choreography.

## Audio and text

Separate dialogue, ambience, physical effects and score. Identify who speaks and preserve exact dialogue in its original language. Describe a visible gesture and vocal delivery instead of an abstract emotion alone. Reference audio controls only its approved role. Lyrics do not authorize captions; visible text must be explicitly specified. A prompt asking for silence is not a verified audio parameter.

## Original prompt examples

Text-only character vignette:

```text
A small clay robot pauses beside a seedling on a kitchen windowsill. It tilts a ceramic watering jug until one drop lands in the soil, then leans closer as the seedling's leaves lift. The camera holds a medium close view with a gentle final push toward the leaves. Soft morning side light reveals fingerprints in the clay. Sound: a tiny water drop, a soft ceramic tap and quiet room ambience. Keep the robot's single round eye and asymmetric arms consistent; no added text.
```

Image and motion reference planning example (requires verified input mapping before use):

```text
Image 1 supplies only the performer's identity and costume. Video 1 supplies only the shoulder turn and arm movement; do not transfer its actor, setting or soundtrack. Shot 1: in the new scene, the performer turns toward camera, raises the right arm, then allows the sleeve to settle after the wrist stops. Keep the face and costume from Image 1. The camera remains a fixed medium shot. Sound: soft fabric movement, no dialogue or score.
```

Edit skeleton: `Edit the approved source video only: change [target] from [A] to [B] during [scope]. Preserve [identity, framing, camera, timing, other layers].`

Continuation skeleton: `Append to the approved source video from its observed [position, pose, motion direction, light and sound]. Continue [new action] toward [endpoint], preserving [anchors]. Do not repeat [completed beat].`

## Revision and execution

Compress duplicate adjectives, generic quality boosters and already visible background details before removing reference roles or action causality. Report mode, reference plan, final prompt and capability gaps. Prompts may be English or another user-requested language; do not translate binding tokens or supplied text.

Official editing/extension availability does not prove an EasyAI mapping. Check exact model, supported modes, reference limits, audio combinations and duration in the live catalogue and adapter. Seedance submits directly through video generate; storyboards are optional. Use current platform capabilities and watermark:false by default.
