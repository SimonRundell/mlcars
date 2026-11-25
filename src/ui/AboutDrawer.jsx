/**
 * The About drawer (BUILD.md 3.3 and section 12): what the app is, an
 * honest note on how it differs from real machine learning (section
 * 7.3), and the licence precis with its badge.
 *
 * @returns {JSX.Element}
 */
export function AboutDrawer() {
  return (
    <div className="about-drawer">
      <section className="about-drawer__section">
        <h4>What this is</h4>
        <p>
          MLCars is a cartoon racing simulation built to make trial-and-error machine learning visible. Six small
          cars drive round a track, crash, remember what went wrong, and try again. Watch long enough and they
          get better at it, step by step, in full view.
        </p>
      </section>

      <section className="about-drawer__section">
        <h4>What it honestly is, and is not</h4>
        <p>
          The cars in Phase 1 and 2 are not running a neural network and are not doing deep learning. Each one is
          a trial-and-error search with a memory, a close relative of hill climbing and backtracking. They really
          do improve with experience, so this is a fair introduction to reward, exploration and learning from
          failure. But it is not the same family of method behind speech recognition or chatbots, and the stored
          route a car builds up is not called a "model" or a "brain" in this text, even though the Brain drawer
          keeps that name as a friendly label. The cars do not understand the track. They have found a list of
          moves that happens to work.
        </p>
        <p>
          Phase 3 adds a second kind of car that reacts to sensors through a small neural network, learned by
          mutation and selection. Even then, it is a simple version of the real thing, built to show the
          difference rather than to compete with it.
        </p>
      </section>

      <section className="about-drawer__section">
        <h4>Tracks</h4>
        <p>
          Every track is a schematic, hand-authored approximation, drawn from the general shape of a real
          circuit but not traced from any map and not to scale. None of them uses an F1 logo, trademark artwork
          or sponsor name.
        </p>
      </section>

      <section className="about-drawer__section">
        <h4>Licence</h4>
        <p>
          You may share and adapt this work with credit, for non-commercial use only, and adaptations must carry
          the same licence. Full terms at{' '}
          <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">
            creativecommons.org/licenses/by-nc-sa/4.0
          </a>
          .
        </p>
        <img src="/cc-by-nc-sa.png" alt="Creative Commons Attribution-NonCommercial-ShareAlike 4.0 licence badge" className="about-drawer__badge" />
        <p className="about-drawer__credit">Author and licence holder: Simon Rundell, Exeter College.</p>
      </section>
    </div>
  );
}
