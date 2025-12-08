

const CustomeTableRow = () => {
    
    
      const fourDigitTime = (time: Date) => {
        return time.toUTCString().slice(-12, -7);
      };
    
      const prefixZero = (x: number): string => {
        if (x >= 0 && x < 10) {
          return "0" + x;
        }
        return "" + x;
      };

    return (
        const TableRow = ({
            scheduleItem,
            index,
            dayContainer,
            startDate,
            endDate,
          }: TableRowProps) => {
            // FOR NEXT TIME: need to either add ref
            const { attributes, listeners, setNodeRef, transform, transition } =
              useSortable({
                id: scheduleItem.id,
                data: { type: "schedule" } as DragData,
              });
            const style = {
              transform: CSS.Transform.toString(transform),
              transition,
            };
            return (
              <tr
                key={scheduleItem.id}
                style={style}
                ref={setNodeRef}
                data-index={index}
                className={`${index === dragIndexRef.current && styles.dragging} ${
                  styles.tableRow
                }`}
                onDoubleClick={(e) =>
                  handleEdit(
                    e,
                    scheduleItem.id,
                    scheduleItem.location,
                    scheduleItem.cost,
                    scheduleItem.details,
                    scheduleItem.multiDay,
                    startDate,
                    endDate,
                    dayContainer
                  )
                }
              >
                {scheduleItem.id === editLineId ? (
                  <EditableRow
                    value={scheduleItem}
                    index={index}
                    dayContainer={dayContainer}
                  ></EditableRow>
                ) : (
                  //          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Editing above : divider~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        
                  <NormalRow
                    value={scheduleItem}
                    dayContainer={dayContainer}
                    {...attributes}
                    {...listeners}
                  ></NormalRow>
                )}
              </tr>
            );
          };
    )
}