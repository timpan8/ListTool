import { useEffect, useRef } from 'preact/hooks';
import type { Dataset } from '../core/model';
import { columnProfiles, type ColumnProfile } from '../core/profile';
import { setViewFilter, viewFilter } from '../core/store';
import { ui } from '../i18n';
import { format } from '../i18n/format';

interface Props {
  dataset: Dataset;
  /** A column to scroll to and put the focus on: asked for from its header menu. */
  focusColumn?: string;
}

/** One value and its count, as a button that narrows the view to its rows. */
function Value({
  profile,
  value,
  count,
}: {
  profile: ColumnProfile;
  value: string;
  count: number;
}) {
  const current = viewFilter.value;
  const active =
    current !== null &&
    current.columnId === profile.column.id &&
    current.value === value &&
    current.mode !== 'contains';
  const blank = value === '';
  const label = format(blank ? ui.profile.onlyBlank : ui.profile.onlyRows, {
    column: profile.column.name,
    value,
  });

  return (
    <li>
      <button
        type="button"
        class={active ? 'facet is-selected' : 'facet'}
        aria-pressed={active}
        title={label}
        onClick={() =>
          setViewFilter(active ? null : { columnId: profile.column.id, value })
        }
      >
        <span class="facet__value">{blank ? ui.profile.blankValue : value}</span>
        <span class="facet__count">{count}</span>
      </button>
    </li>
  );
}

/** What is in each column, and a way to look at one value of it. */
export function ProfilePanel({ dataset, focusColumn }: Props) {
  const wanted = useRef<HTMLElement>(null);

  useEffect(() => {
    if (focusColumn === undefined) return;
    wanted.current?.scrollIntoView({ block: 'start' });
    wanted.current?.focus();
  }, [focusColumn, dataset]);

  if (dataset.rows.length === 0) return <p class="field__help">{ui.profile.empty}</p>;

  return (
    <div class="profile">
      <p class="field__help">{ui.profile.intro}</p>

      {columnProfiles(dataset).map((profile) => (
        <section
          key={profile.column.id}
          class="profile__column"
          tabIndex={-1}
          {...(profile.column.id === focusColumn ? { ref: wanted } : {})}
        >
          <h4 class="profile__name">{profile.column.name}</h4>
          <p class="profile__stats">
            {[
              format(ui.profile.filled, { n: profile.filled }),
              format(ui.profile.blank, { n: profile.empty }),
              format(ui.profile.unique, { n: profile.unique }),
              format(ui.profile.length, {
                shortest: profile.shortest,
                longest: profile.longest,
              }),
            ].join(ui.status.separator)}
          </p>

          <ul class="facets">
            {profile.top.map((entry) => (
              <Value
                key={entry.value}
                profile={profile}
                value={entry.value}
                count={entry.count}
              />
            ))}
            {profile.empty === 0 ? null : (
              <Value profile={profile} value="" count={profile.empty} />
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
