import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

type Props = {
  // Момент последней успешной загрузки данных.
  since: Date;
};

// Подпись «Обновлено N сек назад».
export function UpdatedAgo({ since }: Props) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const update = () =>
      setSeconds(Math.max(0, Math.floor((Date.now() - since.getTime()) / 1000)));

    update(); // сразу правильное значение, без мигания «0» при since в прошлом
    const id = setInterval(update, 1000);
    return () => clearInterval(id); // очистка при размонтировании / смене since
  }, [since]);

  return <Text style={styles.text}>Обновлено {seconds} сек назад</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    color: '#6b7280',
  },
});